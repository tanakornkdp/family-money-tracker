"use client";

import { formatCurrency } from "@/lib/utils/formatCurrency";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Receipt, Category, CreditCard, PaymentMethod } from "@/types";
import { formatDate } from "@/lib/utils/dateHelpers";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Trash2, Sparkles } from "lucide-react";
import { getCategories } from "@/services/categories";
import { getCreditCards } from "@/services/creditCards";

export default function ReceiptList({
  receipts,
  currency = "THB",
}: {
  receipts: Receipt[];
  currency?: string;
}) {

  const router = useRouter();
  const supabase = createClient();
  const { t } = useLanguage();

  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [selectedCardId, setSelectedCardId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const catData = await getCategories(supabase);
        setCategories(catData);
      } catch (err) {
        console.error("Failed to load categories:", err);
      }

      try {
        const cardData = await getCreditCards(supabase);
        setCreditCards(cardData);
      } catch (err) {
        console.error("Failed to load credit cards:", err);
      }
    }
    loadData();
  }, [supabase]);

  const startConvert = async (receipt: Receipt) => {
    setConvertingId(receipt.id);
    setTitle(receipt.parsed_merchant ?? "");
    setCategory("");
    setPaymentMethod("cash");
    setSelectedCardId("");

    if (receipt.ocr_text) {
      setIsAnalyzing(true);
      try {
        const response = await fetch("/api/ai/receipt-analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ocrText: receipt.ocr_text,
            categories: categories.map((c) => c.name),
            cards: creditCards,
          }),
        });

        if (response.ok) {
          const aiResult = await response.json();
          if (aiResult.title) setTitle(aiResult.title);
          
          if (aiResult.category) {
            const matched = categories.find(
              (c) => c.name.toLowerCase() === aiResult.category.toLowerCase()
            );
            if (matched) {
              setCategory(matched.name);
            } else if (categories.length > 0) {
              const fallback = categories.find((c) => c.name.includes(aiResult.category) || aiResult.category.includes(c.name));
              if (fallback) {
                setCategory(fallback.name);
              } else {
                setCategory(categories[0].name);
              }
            } else {
              setCategory(aiResult.category);
            }
          }

          if (aiResult.payment_method) {
            setPaymentMethod(aiResult.payment_method);
            if (aiResult.card_id) {
              setSelectedCardId(aiResult.card_id);
            } else {
              const filtered = creditCards.filter(
                (c) => c.card_type === (aiResult.payment_method === "credit_card" ? "credit" : "debit")
              );
              if (filtered.length > 0) {
                setSelectedCardId(filtered[0].id);
              }
            }
          }
        }
      } catch (err) {
        console.error("AI receipt analyze error:", err);
      } finally {
        setIsAnalyzing(false);
      }
    }
  };

  const handleDelete = async (receiptId: string, filePath?: string) => {
    if (!window.confirm(t.receipts.deleteConfirm)) return;
    setLoading(true);
    setError(null);

    try {
      if (filePath) {
        try {
          await supabase.storage.from("receipts").remove([filePath]);
        } catch (storageErr) {
          console.error("Storage delete error", storageErr);
        }
      }

      const { error: dbError } = await supabase
        .from("receipts")
        .delete()
        .eq("id", receiptId);

      if (dbError) throw new Error(dbError.message);

      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleConvert = async (receipt: Receipt) => {
    if (!receipt.parsed_amount) return;
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
          amount: receipt.parsed_amount,
          type: "expense",
          category: category || "Other",
          date: receipt.parsed_date || new Date().toISOString().split("T")[0],
          payment_method: paymentMethod,
          card_id: selectedCardId || null,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to create transaction");
      }

      const resultData = await res.json();
      const newTransactionId = resultData.transaction.id;

      await supabase
        .from("receipts")
        .update({
          status: "converted",
          transaction_id: newTransactionId,
        })
        .eq("id", receipt.id);

      setConvertingId(null);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (receipts.length === 0) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400">
        {t.receipts.noReceipts}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 p-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {receipts.map((r) => (
        <div
          key={r.id}
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
            <div className="flex items-center gap-3">
              {r.parsed_amount && (
                <p className="font-semibold text-slate-900 dark:text-slate-100">
                  {formatCurrency(r.parsed_amount, currency)}
                </p>
              )}
              <button
                onClick={() => handleDelete(r.id, r.file_path)}
                disabled={loading}
                className="p-1.5 text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                title={t.receipts.delete}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {r.status === "processed" && (
            <div className="mt-3">
              {convertingId === r.id ? (
                <div className="space-y-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                  {isAnalyzing && (
                    <div className="flex items-center gap-2 text-xs font-medium text-indigo-600 dark:text-indigo-400 py-1 px-2 bg-indigo-50 dark:bg-indigo-950/40 rounded-lg w-fit animate-pulse">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>AI is analyzing receipt content...</span>
                    </div>
                  )}

                  <Input
                    label={t.transactions.formTitle}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      {t.transactions.formCategory}
                    </label>
                    <select
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      <option value="">{t.transactions.selectCategory}</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.name}>
                          {cat.icon} {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      {t.creditCards.paymentMethod}
                    </label>
                    <select
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      value={paymentMethod}
                      onChange={(e) => {
                        const val = e.target.value as PaymentMethod;
                        setPaymentMethod(val);
                        if (val === "cash") {
                          setSelectedCardId("");
                        } else {
                          const filtered = creditCards.filter(
                            (c) => c.card_type === (val === "credit_card" ? "credit" : "debit")
                          );
                          if (filtered.length > 0) {
                            setSelectedCardId(filtered[0].id);
                          } else {
                            setSelectedCardId("");
                          }
                        }
                      }}
                    >
                      <option value="cash">{t.creditCards.cash}</option>
                      <option value="credit_card">{t.creditCards.creditCard}</option>
                      <option value="debit_card">{t.creditCards.debitCard}</option>
                    </select>
                  </div>

                  {(paymentMethod === "credit_card" || paymentMethod === "debit_card") && (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        {t.creditCards.selectCard}
                      </label>
                      <select
                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        value={selectedCardId}
                        onChange={(e) => setSelectedCardId(e.target.value)}
                      >
                        <option value="">-- {t.creditCards.selectCard} --</option>
                        {creditCards
                          .filter((c) => c.card_type === (paymentMethod === "credit_card" ? "credit" : "debit"))
                          .map((card) => (
                            <option key={card.id} value={card.id}>
                              {card.name} ({card.card_type === "credit" ? t.creditCards.credit : t.creditCards.debit})
                            </option>
                          ))}
                      </select>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button onClick={() => handleConvert(r)} disabled={loading || isAnalyzing}>
                      {t.goals.confirmAdd}
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
                  {t.transactions.addTransaction}
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
