import { getDashboardTotals, getForecastTransactions } from "@/services/dashboardTotals";
import { getCachedUserSettings } from "@/lib/auth/requestSettings";
import { requireUser } from "@/lib/auth/getUser";
import { getUserHouseholds } from "@/services/households";
import HouseholdViewSwitcher from "@/components/dashboard/HouseholdViewSwitcher";
import { createClient } from "@/lib/supabase/server";
import { getTransactions } from "@/services/transactions";

import { formatCurrency } from "@/lib/utils/formatCurrency";
import AnimatedCurrency from "@/components/ui/AnimatedCurrency";
import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, Banknote, CreditCard, Sparkles } from "lucide-react";
import { translations } from "@/lib/i18n/translations";
import { getRequestLocale } from "@/lib/i18n/server";
import { getCardsWithBalance } from "@/services/creditCards";
import { getHouseholdRecurringBills, getRecurringBills } from "@/services/recurringBills";
import { getTravelTrips } from "@/services/travelTrips";
import { calculateMonthEndForecast, getBangkokDate } from "@/services/cashForecast";
import MobileMonthEndForecast from "@/components/mobile/MobileMonthEndForecast";
import MobileDashboardInsights from "@/components/mobile/MobileDashboardInsights";
import { cookies } from "next/headers";

export default async function MobileDashboard({
  searchParams,
}: {
  searchParams: Promise<{ household?: string | string[] }>;
}) {
  const [user, { household }] = await Promise.all([requireUser(), searchParams]);
  const cookieStore = await cookies();
  const visible = cookieStore.get("mobile_home_cards")?.value?.split(",") ?? ["categories", "bills", "trips"];
  const supabase = await createClient();
  const householdsRequest = getUserHouseholds(supabase);
  const selectedHouseholdRequest = typeof household === "string" && household
    ? householdsRequest.then(households => households.find(item => item.id === household))
    : Promise.resolve(undefined);
  const today = getBangkokDate();
  const dashboardActivity = selectedHouseholdRequest.then(selected => {
    const scope = selected ? { householdId: selected.id } : { personalOnly: true, userIds: [user.id] };
    // Mobile KPIs/categories historically cover all time; only the recent list
    // needs full rows, capped at five. Forecast has its own bounded paged query.
    return Promise.all([
      getTransactions(supabase, { ...scope, limit: 5 }),
      getDashboardTotals(supabase, { ...scope, includeCategories: visible.includes("categories") }),
      getForecastTransactions(supabase, scope, today),
      selected ? getHouseholdRecurringBills(supabase, selected.id, []) : getRecurringBills(supabase, user.id),
    ]);
  });
  const [households, cards, settings, trips, [transactions, totals, forecastTransactions, recurringItems], selectedHousehold] = await Promise.all([
    householdsRequest,
    selectedHouseholdRequest.then(selected => selected ? [] : getCardsWithBalance(supabase)),
    getCachedUserSettings(user.id),
    visible.includes("trips") ? getTravelTrips(supabase, user.id) : [],
    dashboardActivity,
    selectedHouseholdRequest,
  ]);

  const currency = settings?.currency ?? "THB";
  const locale = await getRequestLocale(settings?.language);
  const t = translations[locale];
  const kpis = totals.kpis;
  const cashBalance = totals.cashBalance;
  const availableCredit = cards.filter((card) => card.card_type === "credit").reduce((sum, card) => sum + card.available, 0);
  const monthEndForecast = calculateMonthEndForecast({
    today,
    currentBalance: cashBalance,
    transactions: forecastTransactions,
    recurringItems,
    householdId: selectedHousehold?.id,
  });
 return <main className="space-y-5"><header className="flex items-center justify-between"><div><p className="text-sm text-slate-500">{locale==="th"?"สวัสดี":"Hello"}{settings?.full_name?` ${settings.full_name}`:""}</p><h1 className="text-2xl font-bold">{t.dashboard.title}</h1></div><Link href="/mobile/assistant" className="rounded-full bg-mobile-surface p-3 shadow-sm" aria-label={t.nav.assistant}><Sparkles size={20}/></Link></header>
      <HouseholdViewSwitcher households={households} selectedHouseholdId={selectedHousehold?.id ?? ""} personalLabel={t.reports.personal} label={locale === "th" ? "มุมมองแดชบอร์ด" : "Dashboard view"} />
      <MobileDashboardInsights topCategories={totals.topCategories} recurringItems={recurringItems} trips={trips} currency={currency} visible={visible} locale={locale} />
      <section className="rounded-[28px] bg-gradient-to-br from-emerald-500 to-teal-700 p-6 text-white shadow-lg"><p className="text-sm text-white/75">{t.dashboard.netBalance}</p><p className="mt-2 text-3xl font-bold">{<AnimatedCurrency amount={kpis.balance} currency={currency} />}</p><div className="mt-6 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-white/15 p-3"><ArrowDownLeft size={18}/><p className="mt-2 text-xs text-white/75">{t.dashboard.totalIncome}</p><p className="font-semibold">{<AnimatedCurrency amount={kpis.totalIncome} currency={currency} />}</p></div><div className="rounded-2xl bg-white/15 p-3"><ArrowUpRight size={18}/><p className="mt-2 text-xs text-white/75">{t.dashboard.totalExpense}</p><p className="font-semibold">{<AnimatedCurrency amount={kpis.totalExpense} currency={currency} />}</p></div></div></section>{!selectedHousehold && <section className="grid grid-cols-2 gap-3"><Link href="/mobile/credit-cards" className="rounded-2xl bg-mobile-surface p-4 shadow-sm"><Banknote size={18} className="text-emerald-700"/><p className="mt-2 text-xs text-slate-500">{t.dashboard.cashBalance}</p><p className="font-semibold">{<AnimatedCurrency amount={cashBalance} currency={currency} />}</p></Link><Link href="/mobile/credit-cards" className="rounded-2xl bg-mobile-surface p-4 shadow-sm"><CreditCard size={18} className="text-emerald-700"/><p className="mt-2 text-xs text-slate-500">{locale==="en"?"Available credit":"วงเงินบัตรคงเหลือ"}</p><p className="font-semibold">{<AnimatedCurrency amount={availableCredit} currency={currency} />}</p></Link></section>}<MobileMonthEndForecast result={monthEndForecast} currency={currency} locale={locale}/><section className="grid grid-cols-2 gap-3"><Link href="/mobile/transactions?new=1" className="rounded-2xl bg-mobile-surface p-4 font-semibold shadow-sm">＋ {t.transactions.addTransaction}</Link><Link href="/mobile/receipts" className="rounded-2xl bg-mobile-surface p-4 font-semibold shadow-sm">{t.receipts.title}</Link></section><section><div className="mb-3 flex items-center justify-between"><h2 className="font-bold">{t.dashboard.recentTransactions}</h2><Link href="/mobile/transactions" className="text-sm text-emerald-700">{t.dashboard.viewAll}</Link></div><div className="space-y-2">{transactions.slice(0,5).map(tx=><article key={tx.id} className="flex items-center justify-between rounded-2xl bg-mobile-surface p-4 shadow-sm"><div><p className="font-semibold">{tx.title}</p><p className="mt-1 text-xs text-slate-500">{tx.category} · {tx.date}</p></div><strong className={tx.type==="income"?"text-emerald-600":"text-slate-900 dark:text-white"}>{tx.type==="income"?"+":"−"}{formatCurrency(Number(tx.amount),currency)}</strong></article>)}</div></section></main>;
}


