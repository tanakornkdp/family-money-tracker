import { getCachedUserSettings } from "@/lib/auth/requestSettings";
import { toDateInputValue } from "@/lib/utils/dateHelpers";
import { requireUser } from "@/lib/auth/getUser";
import { createClient } from "@/lib/supabase/server";
import { getBudgetPlans } from "@/services/budgetPlans";
import { getUserHouseholds } from "@/services/households";

import BudgetCalendarManager from "@/components/budget/BudgetCalendarManager";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { getTransactions } from "@/services/transactions";
import { getRequestLocale } from "@/lib/i18n/server";
import { translations } from "@/lib/i18n/translations";

export default async function MobileBudget({ searchParams }: { searchParams: Promise<{ plan?: string }> }) {
  const { plan } = await searchParams;
  const user = await requireUser();
  const supabase = await createClient();
  const currentMonth = toDateInputValue().slice(0, 7);
  const [year, month] = currentMonth.split("-").map(Number);
  const monthEnd = currentMonth + "-" + String(new Date(Date.UTC(year, month, 0)).getUTCDate());
  const [plans, households, settings, transactions, defaultLocale] = await Promise.all([
    getBudgetPlans(supabase),
    getUserHouseholds(supabase),
    getCachedUserSettings(user.id),
    getTransactions(supabase, { dateFrom: currentMonth + "-01", dateTo: monthEnd }),
    getRequestLocale(),
  ]);
  const currency = settings?.currency ?? "THB";
  const t = translations[settings?.language ?? defaultLocale];
  const monthlyExpense = transactions
    .filter((transaction) => transaction.type === "expense" && transaction.date.slice(0, 7) === currentMonth)
    .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

  return (
    <main className="space-y-5">
      <header>
        <p className="text-sm text-slate-500">{t.mobile.wallet}</p>
        <h1 className="text-2xl font-bold">{t.budget.title}</h1>
        <p className="text-sm text-slate-500">{t.budget.subtitle}</p>
      </header>
      <section className="rounded-3xl bg-mobile-surface p-5 shadow-sm">
        <p className="text-sm text-slate-500">{t.budget.spent}</p>
        <p className="mt-2 text-3xl font-bold">{formatCurrency(monthlyExpense, currency)}</p>
        <p className="mt-1 text-xs text-slate-500">{plans.length} {t.budget.createPlan}</p>
      </section>
      <BudgetCalendarManager key={plan} initialPlanId={plan} initialPlans={plans} households={households} userId={user.id} currency={currency} />
    </main>
  );
}
