"use client";
import AnimatedSelect from "@/components/ui/AnimatedSelect";
import Accordion from "@/components/ui/Accordion";

import { formatCurrency } from "@/lib/utils/formatCurrency";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Receipt, TravelTrip } from "@/types";
import { formatDate, toDateInputValue } from "@/lib/utils/dateHelpers";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { getReceiptSignedUrl } from "@/services/receipts";

export default function ReceiptList({
  receipts,
  userId,
  currency = "THB",
}: {
  receipts: Receipt[];
  userId: string;
  currency?: string;
}) {

  const router = useRouter();
  const supabase = createClient();
  const { t, locale } = useLanguage();

  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receiptImage, setReceiptImage] = useState<{ id: string; url: string } | null>(null);
  const [merchantSearch, setMerchantSearch] = useState("");
  const [amountSearch, setAmountSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [activeTrips, setActiveTrips] = useState<TravelTrip[]>([]);
  const [selectedTripId, setSelectedTripId] = useState("");
  const [travelRate, setTravelRate] = useState("");
  const [travelRateDate, setTravelRateDate] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/travel/active", { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() : null)
      .then((data: { trips?: TravelTrip[] } | null) => {
        if (!cancelled && data?.trips) {
          setActiveTrips(data.trips);
          if (data.trips.length === 1) setSelectedTripId(data.trips[0].id);
        }
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  const selectedTrip = activeTrips.find((trip) => trip.id === selectedTripId);

  useEffect(() => {
    if (!selectedTrip || !date || selectedTrip.currency === "THB") return;
    let cancelled = false;
    fetch(`/api/travel/rate?currency=${selectedTrip.currency}&date=${date}`, { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        return data as { rate: number; date: string };
      })
      .then((data) => {
        if (!cancelled) { setTravelRate(String(data.rate)); setTravelRateDate(data.date); }
      })
      .catch(() => {
        if (!cancelled) { setTravelRate(String(selectedTrip.exchange_rate_to_thb)); setTravelRateDate(""); }
      });
    return () => { cancelled = true; };
  }, [selectedTrip, date]);

  const startConvert = useCallback((receipt: Receipt) => {
    setConvertingId(receipt.id);
    setTitle(receipt.parsed_merchant ?? "");
    setCategory("");
    setAmount(receipt.parsed_amount?.toString() ?? "");
    setDate(receipt.parsed_date ?? (receipt.ocr_text?.startsWith('[AI อ่านภาพ') ? '' : toDateInputValue()));
  }, []);

  useEffect(() => {
    let active = true;
    const openReceipt = () => {
      const receipt = receipts.find(row => window.location.hash === "#receipt-" + encodeURIComponent(row.id));
      if (!receipt || receipt.user_id !== userId || receipt.transaction_id || !["pending", "processed"].includes(receipt.status)) return;
      queueMicrotask(() => {
        if (!active) return;
        startConvert(receipt);
        document.getElementById("receipt-" + receipt.id)?.scrollIntoView({ block: "start" });
      });
    };
    openReceipt();
    window.addEventListener("hashchange", openReceipt);
    return () => { active = false; window.removeEventListener("hashchange", openReceipt); };
  }, [receipts, startConvert, userId]);

  const handleConvert = async (receipt: Receipt) => {
    if (!title.trim() || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) {
      setError('กรุณาตรวจชื่อร้านและวันที่ก่อนยืนยัน');
      return;
    }
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("กรุณาตรวจสอบจำนวนเงินให้มากกว่า 0");
      return;
    }
    if (activeTrips.length > 1 && !selectedTrip) {
      setError("เลือกทริปที่ต้องการผูกกับใบเสร็จนี้ก่อน");
      return;
    }
    const rate = selectedTrip?.currency === "THB" ? 1 : Number(travelRate);
    if (selectedTrip && (!Number.isFinite(rate) || rate <= 0)) {
      setError("กรุณารออัตราแลกเปลี่ยน หรือกรอกอัตราเอง");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const userResult = await supabase.auth.getUser();
      const currentUser = userResult.data.user;

      if (!currentUser) {
        throw new Error("Not authenticated");
      }

      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title || "Receipt purchase",
          amount: parsedAmount,
          type: "expense",
          category: category || "Other",
          date: date || toDateInputValue(),
          ...(selectedTrip ? {
            travel_trip_id: selectedTrip.id,
            travel_original_amount: parsedAmount,
            travel_original_currency: selectedTrip.currency,
            travel_exchange_rate_to_thb: rate,
            travel_exchange_rate_date: travelRateDate || date,
          } : {}),
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to create transaction");
      }

      const resultData = await res.json();
      const newTransactionId = resultData.transaction.id;

      const { data: convertedReceipt, error: receiptUpdateError } = await supabase
        .from("receipts")
        .update({
          status: "converted",
          transaction_id: newTransactionId,
        })
        .eq("id", receipt.id)
        .eq("user_id", currentUser.id)
        .eq("status", receipt.status)
        .select("id")
        .maybeSingle();

      if (receiptUpdateError || !convertedReceipt) {
        const rollback = await fetch(`/api/transactions/${newTransactionId}`, { method: "DELETE" });
        if (!rollback.ok) {
          throw new Error("บันทึกรายการแล้ว แต่ปิดใบเสร็จไม่สำเร็จ กรุณาตรวจสอบรายการก่อนลองอีกครั้ง");
        }
        throw new Error(receiptUpdateError?.message ?? "ใบเสร็จนี้ถูกแปลงเป็นรายการไปแล้ว");
      }

      setConvertingId(null);
      window.dispatchEvent(new Event("finance:review-updated"));
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const filteredReceipts = useMemo(() => receipts.filter((receipt) => {
    const receiptDate = receipt.parsed_date ?? receipt.created_at.slice(0, 10);
    const merchantMatches = !merchantSearch || (receipt.parsed_merchant ?? "").toLocaleLowerCase().includes(merchantSearch.toLocaleLowerCase());
    const amountMatches = !amountSearch || (receipt.parsed_amount !== null && String(receipt.parsed_amount).includes(amountSearch.replace(/,/g, "")));
    return merchantMatches && amountMatches && (!dateFrom || receiptDate >= dateFrom) && (!dateTo || receiptDate <= dateTo);
  }), [receipts, merchantSearch, amountSearch, dateFrom, dateTo]);

  if (receipts.length === 0) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400">
        {t.receipts.noReceipts}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Input label={locale === "en" ? "Merchant" : "ร้านค้า"} value={merchantSearch} onChange={(event) => setMerchantSearch(event.target.value)} placeholder={locale === "en" ? "Search merchant" : "ค้นหาร้านค้า"} />
        <Input label={locale === "en" ? "Amount" : "ยอดเงิน"} value={amountSearch} onChange={(event) => setAmountSearch(event.target.value)} type="number" min="0" placeholder="0" />
        <Input label={locale === "en" ? "From" : "ตั้งแต่"} value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} type="date" />
        <Input label={locale === "en" ? "To" : "ถึงวันที่"} value={dateTo} onChange={(event) => setDateTo(event.target.value)} type="date" />
      </div>
      {error && (
        <div className="rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 p-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {filteredReceipts.length === 0 && <p className="py-6 text-center text-sm text-slate-500">{locale === "en" ? "No receipts match your search." : "ไม่พบใบเสร็จตามเงื่อนไขที่เลือก"}</p>}
      {filteredReceipts.map((r) => (
        <div
          key={r.id}
          id={`receipt-${r.id}`}
          className="rounded-xl border border-slate-200 dark:border-slate-800 p-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-900 dark:text-slate-100">
                {r.parsed_merchant || "Unprocessed receipt"}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {formatDate(r.created_at)} - Status: {r.status}
              </p>
            </div>
           {r.parsed_amount && (
              <p className="font-semibold text-slate-900 dark:text-slate-100">
                {formatCurrency(r.parsed_amount, selectedTrip?.currency ?? currency)}
              </p>
            )}
          </div>

          {r.ocr_text?.startsWith('[AI อ่านภาพ') && <Accordion className="mt-3 text-sm text-slate-600 dark:text-slate-300" triggerClassName="cursor-pointer py-2" title={<>ตรวจผลอ่านและข้อควรทบทวน</>}><p className="whitespace-pre-wrap break-words rounded-xl bg-mobile-surface-muted p-3">{r.ocr_text}</p></Accordion>}
          {r.file_path && (
            <div className="mt-2 text-sm">
              {receiptImage?.id === r.id ? (
                <a href={receiptImage.url} target="_blank" rel="noopener noreferrer" className="underline">
                  {locale === "th" ? "เปิดรูปใบเสร็จ" : "Open receipt image"}
                </a>
              ) : (
                <button type="button" className="underline" onClick={async () => {
                  setError(null);
                  try {
                    setReceiptImage({ id: r.id, url: await getReceiptSignedUrl(supabase, r.file_path) });
                  } catch {
                    setError(locale === "th" ? "เปิดรูปใบเสร็จไม่ได้" : "Could not open the receipt image.");
                  }
                }}>
                  {locale === "th" ? "ดูรูปใบเสร็จ" : "View receipt image"}
                </button>
              )}
            </div>
          )}

          {(r.status === "processed" || r.status === "pending") && !r.transaction_id && r.user_id === userId && (
            <div className="mt-3">
              {convertingId === r.id ? (
                <div className="space-y-2">
                  <p className="text-sm text-mobile-muted">{locale === "th" ? "ตรวจชื่อร้าน ยอดเงิน วันที่ และหมวดหมู่ จากนั้นกดบันทึกรายจ่าย" : "Check the merchant, amount, date and category, then save the expense."}</p>
                  <Input
                    label={t.transactions.formTitle}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                  <Input
                    label={selectedTrip ? `จำนวนเงิน (${selectedTrip.currency})` : t.transactions.formAmount}
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                  {activeTrips.length > 1 && (
                    <label className="block space-y-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                      เลือกทริป
                      <AnimatedSelect value={selectedTripId} onChange={(event) => setSelectedTripId(event.target.value)} className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-base dark:border-slate-700 dark:bg-slate-800">
                        <option value="">เลือกทริป</option>
                        {activeTrips.map((trip) => <option key={trip.id} value={trip.id}>{trip.name} · {trip.currency}</option>)}
                      </AnimatedSelect>
                    </label>
                  )}
                  {selectedTrip && selectedTrip.currency !== "THB" && (
                    <div className="space-y-1">
                      <Input label={`1 ${selectedTrip.currency} = กี่บาท`} type="number" min="0.000001" step="0.000001" value={travelRate} onChange={(event) => setTravelRate(event.target.value)} />
                      <p className="text-xs text-slate-500">{travelRateDate ? `เรทอ้างอิง ณ ${travelRateDate}` : "ใช้อัตราที่กำหนดไว้ในทริป · แก้ไขได้"}</p>
                    </div>
                  )}
                  <Input
                    label={t.transactions.formDate}
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                  <Input
                    label={t.transactions.formCategory}
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g. Groceries"
                  />
                  <div className="flex gap-2">
                    <Button onClick={() => handleConvert(r)} disabled={loading}>
                      {locale === "th" ? "บันทึกรายจ่าย" : "Save expense"}
                    </Button>
                    <Button variant="secondary" onClick={() => setConvertingId(null)}>
                      {t.goals.cancel}
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="secondary"
                  onClick={() => startConvert(r)}
                  className="w-full"
                >
                  {locale === "th" ? "ตรวจและบันทึกรายจ่าย" : "Review and record expense"}
                </Button>
              )}
            </div>
          )}

          {r.status === "failed" && (
            <p className="mt-2 text-xs text-red-600 dark:text-red-400">
              OCR processing failed. Try uploading a clearer image.
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
