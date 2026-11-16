"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

type Transfer = { id: string; trip_name: string; amount: number; confirmed_at: string | null };

export default function TripTransferInbox({ userId }: { userId: string }) {
  const { locale } = useLanguage();
  const th = locale === "th";
  const [rows, setRows] = useState<Transfer[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    void createClient().from("trip_transfers").select("id,trip_name,amount,confirmed_at")
      .eq("recipient", userId).is("confirmed_at", null).then(({ data }) => {
        if (active && data) setRows(data);
      });
    return () => { active = false; };
  }, [userId]);

  async function confirm(id: string) {
    setBusy(true);
    setError(false);
    try {
      const { error } = await createClient().rpc("confirm_trip_transfer", { request_id: id });
      if (error) throw error;
      setRows(current => current.filter(item => item.id !== id));
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  if (!rows.length) return null;
  return <section className="mb-5 space-y-3 rounded-2xl border border-mobile-border bg-mobile-surface p-4">
    <h2>{th ? "เงินโอนที่รอยืนยัน" : "Transfers awaiting confirmation"}</h2>
    {rows.map(item => <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-mobile-border pt-3">
      <span className="break-words">{item.trip_name} · {new Intl.NumberFormat(locale, { style: "currency", currency: "THB" }).format(item.amount)}</span>
      <button type="button" disabled={busy} onClick={() => void confirm(item.id)} className="min-h-11 rounded-xl bg-emerald-700 px-3 text-white">{th ? "ได้รับเงินแล้ว" : "Confirm receipt"}</button>
    </div>)}
    {error && <p role="alert">{th ? "ยืนยันไม่สำเร็จ กรุณาลองใหม่" : "Confirmation failed. Try again."}</p>}
  </section>;
}
