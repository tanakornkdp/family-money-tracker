"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Scale } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import type { ReconciliationAccount } from "@/services/accountBalances";

type SavedReconciliation = { account_key: string; account_name: string; calculated_balance: number; actual_balance: number; difference: number; note: string | null; reconciled_at: string };

export default function AccountReconciliation({ accounts, currency, locale }: { accounts: ReconciliationAccount[]; currency: string; locale: "th" | "en" }) {
  const supabase = useMemo(() => createClient(), []);
  const [saved, setSaved] = useState<Record<string, SavedReconciliation>>({});
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [actual, setActual] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    void supabase.from("account_reconciliations").select("account_key,account_name,calculated_balance,actual_balance,difference,note,reconciled_at")
      .then(({ data, error: queryError }) => {
        if (!active) return;
        if (queryError) setError(queryError.message);
        else setSaved(Object.fromEntries(((data ?? []) as unknown as SavedReconciliation[]).map((row) => [row.account_key, row])));
      });
    return () => { active = false; };
  }, [supabase]);

  const openEditor = (account: ReconciliationAccount) => {
    setEditingKey(account.key); setActual(String(saved[account.key]?.actual_balance ?? account.balance));
    setNote(saved[account.key]?.note ?? ""); setError(""); setMessage("");
  };
  const save = async (account: ReconciliationAccount) => {
    const actualValue = Number(actual);
    if (!actual.trim() || !Number.isFinite(actualValue)) { setError(locale === "en" ? "Enter a valid balance." : "กรุณากรอกยอดเงินจริงให้ถูกต้อง"); return; }
    setBusy(true); setError(""); setMessage("");
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error(locale === "en" ? "Please sign in again." : "กรุณาเข้าสู่ระบบใหม่");
      const row: SavedReconciliation = { account_key: account.key, account_name: account.name, calculated_balance: account.balance, actual_balance: actualValue, difference: actualValue - account.balance, note: note.trim() || null, reconciled_at: new Date().toISOString() };
      const { error: saveError } = await supabase.from("account_reconciliations").upsert({ ...row, user_id: auth.user.id }, { onConflict: "user_id,account_key" });
      if (saveError) throw saveError;
      setSaved((current) => ({ ...current, [account.key]: row })); setEditingKey(null);
      setMessage(locale === "en" ? "Reconciliation saved." : "บันทึกการกระทบยอดแล้ว");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save reconciliation"); }
    finally { setBusy(false); }
  };

  return <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
    <div><h2 className="flex items-center gap-2 font-semibold"><Scale size={17}/>{locale === "en" ? "Reconcile balances" : "กระทบยอดบัญชี"}</h2><p className="mt-1 text-sm text-slate-500">{locale === "en" ? "Compare app balances with your latest statement or cash count." : "เปรียบเทียบยอดในแอปกับยอดใน statement หรือเงินสดจริง"}</p></div>
    {error && <p role="alert" className="rounded-lg bg-rose-50 p-2 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">{error}</p>}
    {message && <p role="status" className="text-sm text-emerald-700 dark:text-emerald-300">{message}</p>}
    <ul className="divide-y divide-slate-100 dark:divide-slate-800">{accounts.map((account) => {
      const previous = saved[account.key];
      const delta = previous ? account.balance - Number(previous.actual_balance) : null;
      return <li key={account.key} className="py-3 first:pt-0 last:pb-0">
        <div className="flex flex-wrap items-center justify-between gap-3"><div className="min-w-0"><p className="font-medium">{account.name}</p><p className="text-xs text-slate-500">{locale === "en" ? "App balance" : "ยอดในแอป"}: <span className="tabular-nums">{formatCurrency(account.balance, currency)}</span></p>{previous && <p className={`text-xs ${delta === 0 ? "text-emerald-600" : "text-amber-700 dark:text-amber-300"}`}>{locale === "en" ? "Since last check" : "เปลี่ยนจากยอดที่ตรวจล่าสุด"}: {formatCurrency(delta ?? 0, currency)} · {new Date(previous.reconciled_at).toLocaleDateString(locale === "en" ? "en-GB" : "th-TH")}</p>}</div>
          {editingKey !== account.key && <button type="button" onClick={() => openEditor(account)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-300 px-3 text-sm font-medium hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-700 dark:hover:bg-slate-800"><Check size={15}/>{locale === "en" ? "Check" : "ตรวจยอด"}</button>}
        </div>
        {editingKey === account.key && <div className="mt-3 grid gap-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-950 sm:grid-cols-[1fr_1fr_auto] sm:items-end"><label className="space-y-1 text-xs text-slate-500"><span>{locale === "en" ? "Actual balance" : "ยอดเงินจริง"}</span><input type="number" step="0.01" value={actual} onChange={(event) => setActual(event.target.value)} className="min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white" /></label><label className="space-y-1 text-xs text-slate-500"><span>{locale === "en" ? "Note (optional)" : "หมายเหตุ (ไม่บังคับ)"}</span><input value={note} onChange={(event) => setNote(event.target.value)} maxLength={200} className="min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white" /></label><div className="flex gap-2"><button type="button" onClick={() => void save(account)} disabled={busy} className="min-h-10 rounded-lg bg-emerald-700 px-3 text-sm font-semibold text-white disabled:opacity-60">{busy ? "…" : (locale === "en" ? "Save" : "บันทึก")}</button><button type="button" onClick={() => setEditingKey(null)} disabled={busy} className="min-h-10 rounded-lg px-3 text-sm">{locale === "en" ? "Cancel" : "ยกเลิก"}</button></div><p className="text-xs text-slate-500 sm:col-span-3">{locale === "en" ? `Difference: ${formatCurrency(Number(actual || 0) - account.balance, currency)}` : `ส่วนต่าง: ${formatCurrency(Number(actual || 0) - account.balance, currency)}`}</p></div>}
      </li>;
    })}</ul>
  </section>;
}
