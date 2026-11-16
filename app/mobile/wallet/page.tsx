import { requireUser } from "@/lib/auth/getUser";
import { createClient } from "@/lib/supabase/server";
import { getTransactions, calculateCashBalance } from "@/services/transactions";
import { getCardsWithBalance } from "@/services/creditCards";
import { getRecurringBills, getUpcomingOccurrences } from "@/services/recurringBills";
import { getGoals } from "@/services/goals";
import { getUserSettings } from "@/services/userSettings";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import Link from "next/link";
import { ArrowDownToLine, CreditCard, LockKeyhole, ReceiptText, WalletCards } from "lucide-react";
import { getRequestLocale } from "@/lib/i18n/server";
import { translations } from "@/lib/i18n/translations";

function WalletStat({ icon: Icon, label, value, currency, tone = "text-mobile-ink" }: { icon: typeof WalletCards; label: string; value: number; currency: string; tone?: string }) { return <div className="rounded-2xl bg-mobile-surface-muted p-4"><Icon size={18} className="text-emerald-700"/><p className="mt-3 text-xs text-mobile-muted">{label}</p><p className={`mt-1 text-lg font-bold tabular-nums ${tone}`}>{formatCurrency(value, currency)}</p></div>; }
function dateAfter(days: number) { const value = new Date(); value.setDate(value.getDate() + days); return value.toISOString().slice(0, 10); }

export default async function MobileWalletPage() {
  const locale = await getRequestLocale();
  const copy = translations[locale].mobile.walletPage;
  const user = await requireUser();
  const supabase = await createClient();
  const [transactions, cards, recurring, goals, settings] = await Promise.all([
    getTransactions(supabase, { personalOnly: true, userIds: [user.id] }),
    getCardsWithBalance(supabase), getRecurringBills(supabase, user.id), getGoals(supabase), getUserSettings(supabase, user.id),
  ]);
  const currency = settings?.currency ?? "THB";
  const cash = calculateCashBalance(transactions);
  const held = goals.filter((goal) => goal.status === "active").reduce((sum, goal) => sum + Math.max(0, Number(goal.target_amount) - Number(goal.current_amount)), 0);
  const creditHeld = cards.reduce((sum, card) => sum + (card.card_type === "credit" ? Number(card.balance) : 0), 0);
  const start = new Date().toISOString().slice(0, 10); const end = dateAfter(31);
  const upcoming = getUpcomingOccurrences(recurring, start, end).filter(({ bill }) => bill.type === "expense").slice(0, 4);
  const upcomingTotal = upcoming.reduce((sum, item) => sum + Number(item.bill.amount), 0);
  const usable = cash - held - creditHeld - upcomingTotal;
  return <main className="space-y-5"><header><h1>{copy.title}</h1><p className="mt-1 text-sm text-mobile-muted">{copy.subtitle}</p></header>
    <section className="rounded-3xl bg-emerald-700 p-5 text-white shadow-lg"><p className="text-sm text-white/75">{copy.totalMoney}</p><p className="mt-2 text-3xl font-bold tabular-nums">{formatCurrency(cash, currency)}</p><p className="mt-2 text-sm text-white/80">{copy.availableHelp}</p><p className="mt-1 text-2xl font-bold tabular-nums" aria-label={copy.available}>{formatCurrency(usable, currency)}</p></section>
    <section className="grid grid-cols-2 gap-3"><WalletStat icon={LockKeyhole} label={copy.reserved} value={held} currency={currency} tone="text-amber-700"/><WalletStat icon={ReceiptText} label={copy.upcoming31Days} value={upcomingTotal} currency={currency} tone="text-rose-700"/><WalletStat icon={CreditCard} label={copy.cardBalance} value={creditHeld} currency={currency} tone="text-violet-700"/><WalletStat icon={ArrowDownToLine} label={copy.cashBalance} value={cash} currency={currency}/></section>
    <section className="rounded-3xl bg-mobile-surface p-4 shadow-sm"><div className="flex items-center justify-between"><h2 className="font-bold">{copy.upcomingBills}</h2><Link href="/mobile/recurring-bills" className="text-sm font-semibold text-emerald-700">{copy.viewAll}</Link></div>{upcoming.length ? <div className="mt-2 divide-y divide-mobile-border">{upcoming.map(({ date, bill }) => <div key={`${bill.id}-${date}`} className="flex items-center justify-between py-3"><div><p className="font-semibold">{bill.name}</p><p className="text-xs text-mobile-muted">{date} · {bill.category}</p></div><strong className="tabular-nums">{formatCurrency(Number(bill.amount), currency)}</strong></div>)}</div> : <p className="py-5 text-sm text-mobile-muted">{copy.noUpcomingBills}</p>}</section>
    <Link href="/mobile/transactions" className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-mobile-surface-muted font-semibold"><WalletCards size={18}/>{copy.viewTransactions}</Link>
  </main>;
}
