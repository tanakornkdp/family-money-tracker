import { getCachedUserSettings } from "@/lib/auth/requestSettings";
import { requireUser } from "@/lib/auth/getUser";
import { createClient } from "@/lib/supabase/server";
import { getTransactions } from "@/services/transactions";
import { getReceipts } from "@/services/receipts";
import { getRecurringBills, getUpcomingOccurrences } from "@/services/recurringBills";

import { formatCurrency } from "@/lib/utils/formatCurrency";
import Link from "next/link";
import DuplicateReviewActions from "@/components/transactions/DuplicateReviewActions";
import { AlertTriangle, CalendarClock, Copy, FileSearch, ShieldCheck } from "lucide-react";
import { getRequestLocale } from "@/lib/i18n/server";
import { translations } from "@/lib/i18n/translations";

function dateAfter(days: number) { const value = new Date(); value.setDate(value.getDate() + days); return value.toISOString().slice(0, 10); }

export default async function MobileReviewPage() {
  const locale = await getRequestLocale();
  const copy = translations[locale].mobile.reviewPage;
  const user = await requireUser(); const supabase = await createClient();
  const [transactions, receipts, bills, settings] = await Promise.all([getTransactions(supabase, { userIds: [user.id] }), getReceipts(supabase), getRecurringBills(supabase, user.id), getCachedUserSettings(user.id)]);
  const currency = settings?.currency ?? "THB";
  const pendingReceipts = receipts.filter((receipt) => receipt.status === "pending" || receipt.status === "processed" && !receipt.transaction_id);
  const duplicateGroups = new Map<string, typeof transactions>();
  for (const transaction of transactions) { const key = `${transaction.date}|${transaction.title.trim().toLowerCase()}|${Number(transaction.amount).toFixed(2)}`; const group = duplicateGroups.get(key) ?? []; group.push(transaction); duplicateGroups.set(key, group); }
  const duplicates = [...duplicateGroups.entries()].filter(([, group]) => group.length > 1).slice(0, 8);
  const start = new Date().toISOString().slice(0, 10); const end = dateAfter(14);
  const upcoming = getUpcomingOccurrences(bills, start, end).filter(({ bill }) => bill.type === "expense").slice(0, 8);
  const pendingCount = pendingReceipts.length + duplicates.length + upcoming.length;
  return <main className="space-y-5"><header><h1>{copy.title}</h1><p className="mt-1 text-sm text-mobile-muted">{copy.subtitle}</p></header>
    <section className="rounded-3xl bg-emerald-700 p-5 text-white"><div className="flex items-center gap-2"><ShieldCheck size={20}/><h2 className="font-bold">{copy.center}</h2></div><p className="mt-2 text-sm text-white/80">{copy.pendingSummary.replace("{count}", String(pendingCount))}</p></section>
    <ReviewSection icon={FileSearch} title={copy.receipts} count={pendingReceipts.length}>{pendingReceipts.length ? pendingReceipts.map((receipt) => <Link key={receipt.id} href={`/mobile/receipts#receipt-${receipt.id}`} className="flex items-center justify-between border-b border-mobile-border py-3"><span><span className="block font-semibold">{receipt.parsed_merchant ?? copy.newReceipt}</span><span className="text-xs text-mobile-muted">{receipt.parsed_date ?? copy.noDate}</span></span><span className="text-sm font-semibold text-emerald-700">{copy.reviewAction} ›</span></Link>) : <Empty text={copy.noReceipts}/>}</ReviewSection>
    <div id="duplicates"><ReviewSection icon={Copy} title={copy.duplicates} count={duplicates.length}>{duplicates.length ? duplicates.map(([key, group]) => <div key={key} className="border-b border-mobile-border py-3"><div className="flex items-center justify-between"><span className="font-semibold">{group[0].title}</span><span className="text-sm font-bold">{formatCurrency(Number(group[0].amount), currency)}</span></div><p className="mt-1 text-xs text-amber-700">{copy.duplicateFound.replace("{count}", String(group.length))}</p><DuplicateReviewActions userId={user.id} groupKey={key + "|" + group.length} entries={group.map(item => ({ id: item.id, label: `${item.title} · ${item.category} · ${item.date} · ${item.payment_method}` }))} /></div>) : <Empty text={copy.noDuplicates}/>}</ReviewSection></div>
    <ReviewSection icon={CalendarClock} title={copy.upcoming} count={upcoming.length}>{upcoming.length ? upcoming.map(({ date, bill }) => <div key={`${bill.id}-${date}`} className="flex items-center justify-between border-b border-mobile-border py-3"><span><span className="block font-semibold">{bill.name}</span><span className="text-xs text-mobile-muted">{date} · {bill.category}</span></span><span className="font-semibold tabular-nums">{formatCurrency(Number(bill.amount), currency)}</span></div>) : <Empty text={copy.noUpcoming}/>}</ReviewSection>
    <div className="flex items-start gap-2 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-950/35 dark:text-amber-200"><AlertTriangle size={18} className="mt-0.5 shrink-0"/><p>{copy.advisory}</p></div>
  </main>;
}
function ReviewSection({ icon: Icon, title, count, children }: { icon: typeof FileSearch; title: string; count: number; children: React.ReactNode }) { return <section className="rounded-3xl bg-mobile-surface p-4 shadow-sm"><div className="flex items-center gap-2"><Icon size={19} className="text-emerald-700"/><h2 className="font-bold">{title}</h2><span className="ml-auto rounded-full bg-mobile-surface-muted px-2 py-0.5 text-xs font-bold">{count}</span></div><div className="mt-2">{children}</div></section>; }
function Empty({ text }: { text: string }) { return <p className="py-4 text-sm text-mobile-muted">{text}</p>; }
