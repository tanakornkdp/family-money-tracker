"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, FileUp } from "lucide-react";
import { filterSecondary } from "@/components/ui/FilterBar";
import type { CreditCard, Transaction } from "@/types";
import { parseTransactionCsv, transactionsToCsv, type ImportedTransaction } from "@/services/transactionImportExport";

export default function TransactionImportExport({ transactions, cards = [], locale, compact = false }: { compact?: boolean; transactions: Transaction[]; cards?: CreditCard[]; locale: "th" | "en" }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<ImportedTransaction[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [cardMappings, setCardMappings] = useState<Partial<Record<"credit_card" | "debit_card", string>>>({});
  const english = locale === "en";
  const needsCardType = (method: ImportedTransaction["payment_method"]) => method === "credit_card" || method === "debit_card";
  const cardIdFor = (row: ImportedTransaction) => {
    if (!needsCardType(row.payment_method)) return null;
    const method = row.payment_method as "credit_card" | "debit_card";
    const expectedType = method === "credit_card" ? "credit" : "debit";
    const original = cards.find((card) => card.id === row.card_id && card.card_type === expectedType);
    if (original) return original.id;
    return cards.find((card) => card.id === cardMappings[method] && card.card_type === expectedType)?.id ?? null;
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([transactionsToCsv(transactions)], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = "family-money-transactions.csv"; link.click(); URL.revokeObjectURL(url);
  };
  const choose = async (file?: File) => {
    setMessage(""); setPreview([]); if (!file) return;
    if (file.size > 5_000_000) { setMessage(english ? "File must be 5 MB or smaller." : "ไฟล์ต้องไม่เกิน 5 MB"); return; }
    try { const parsed = parseTransactionCsv(await file.text()); if (!parsed.length) throw new Error(english ? "No valid rows found." : "ไม่พบรายการที่ถูกต้องในไฟล์"); setPreview(parsed); }
    catch (error) { setMessage((error as Error).message); }
  };
  const importAll = async () => {
    if (!preview.length) return;
    if (preview.some((row) => needsCardType(row.payment_method) && !cardIdFor(row))) {
      setMessage(english ? "Choose a matching card for each card payment before importing." : "เลือกบัตรเครดิต/เดบิตที่ตรงกันก่อนนำเข้ารายการ");
      return;
    }
    const keys = new Set(transactions.map((tx) => [tx.date, tx.title.trim().toLocaleLowerCase(), Number(tx.amount), tx.category, tx.type].join("|")));
    const duplicates = preview.filter((row) => keys.has([row.date, row.title.trim().toLocaleLowerCase(), row.amount, row.category, row.type].join("|"))).length;
    if (duplicates && !window.confirm(english ? `${duplicates} similar rows already exist. Import anyway?` : `พบ ${duplicates} รายการที่คล้ายกับข้อมูลเดิม ต้องการนำเข้าอยู่ดีหรือไม่?`)) return;
    setBusy(true); setMessage("");
    let saved = 0;
    try {
      for (const row of preview) {
        const response = await fetch("/api/transactions?source=import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...row, ...(needsCardType(row.payment_method) ? { card_id: cardIdFor(row) } : {}) }) });
        if (!response.ok) { const body = await response.json().catch(() => ({})); throw new Error(`${english ? "Stopped after" : "หยุดหลังบันทึก"} ${saved} ${english ? "rows" : "รายการ"}: ${body.error ?? response.statusText}`); }
        saved++;
      }
      setPreview([]); setMessage(english ? `Imported ${saved} rows.` : `นำเข้า ${saved} รายการแล้ว`); router.refresh();
    } catch (error) { setMessage((error as Error).message); if (saved) router.refresh(); }
    finally { setBusy(false); if (input.current) input.current.value = ""; }
  };
  return <section className={compact ? "w-full min-w-0 space-y-2" : "space-y-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-800"}>
    {!compact && <div><h3 className="font-semibold">{english ? "Import and export" : "นำเข้าและส่งออก"}</h3><p className="mt-1 text-xs text-slate-500">{english ? "Excel-compatible CSV and common bank statement CSV/TSV formats." : "ใช้ไฟล์ CSV ที่เปิดใน Excel ได้ หรือบันทึก statement จากแอปการเงินเป็น CSV/TSV ก่อนนำเข้า"}</p></div>}
    <div className="flex flex-wrap gap-2"><button type="button" onClick={download} className={filterSecondary}><Download size={15}/>{english ? "Export CSV" : "ส่งออก CSV"}</button><button type="button" onClick={() => input.current?.click()} disabled={busy} className={filterSecondary}><FileUp size={15}/>{english ? "Choose CSV / TSV" : "เลือก CSV / TSV"}</button><input ref={input} type="file" accept=".csv,.tsv,text/csv,text/tab-separated-values" className="hidden" onChange={(event) => void choose(event.target.files?.[0])}/></div>
    {!!preview.length && <div className="space-y-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-900"><p className="text-sm font-medium">{english ? `Preview: ${preview.length} rows` : `ตรวจสอบก่อนนำเข้า ${preview.length} รายการ`}</p><div className="max-h-40 space-y-1 overflow-auto text-xs">{preview.slice(0, 8).map((row, i) => <p key={`${row.date}-${i}`} className="flex justify-between gap-2"><span className="truncate">{row.date} · {row.title} · {row.category}</span><span>{row.amount.toLocaleString()} ฿</span></p>)}</div>{(["credit_card", "debit_card"] as const).filter((method) => preview.some((row) => row.payment_method === method && !cardIdFor(row))).map((method) => <label key={method} className="block space-y-1 text-xs text-slate-500">{english ? `Choose ${method === "credit_card" ? "credit" : "debit"} card` : `เลือก${method === "credit_card" ? "บัตรเครดิต" : "บัตรเดบิต"}`}<select value={cardMappings[method] ?? ""} onChange={(event) => setCardMappings((current) => ({ ...current, [method]: event.target.value }))} className="min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"><option value="">{english ? "Select a card" : "เลือกบัตร"}</option>{cards.filter((card) => card.card_type === (method === "credit_card" ? "credit" : "debit")).map((card) => <option key={card.id} value={card.id}>{card.name}</option>)}</select></label>)}<button type="button" disabled={busy} onClick={() => void importAll()} className="min-h-10 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white disabled:opacity-50">{busy ? (english ? "Importing…" : "กำลังนำเข้า…") : (english ? "Confirm import" : "ยืนยันนำเข้า")}</button></div>}
    {message && <p role="status" className="text-sm text-slate-600 dark:text-slate-300">{message}</p>}
  </section>;
}
