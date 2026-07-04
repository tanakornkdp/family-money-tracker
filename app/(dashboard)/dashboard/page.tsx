import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import {
  getTransactions,
  calculateKpis,
  calculateMemberBreakdown,
  calculateCategoryBreakdown,
  calculateTypeBreakdown,
  calculateStackedBarData,
  calculateCashBalance,
} from "@/services/transactions";
import {
  getUserSettings,
  getDisplayNamesByUserIds,
  getUserProfilesByIds,
} from "@/services/userSettings";
import { getUserHouseholds, getHouseholdMembers } from "@/services/households";
import { translations, Locale } from "@/lib/i18n/translations";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { getDefaultDateRange, PeriodGranularity } from "@/lib/utils/dateHelpers";
import KpiCard from "@/components/dashboard/KpiCard";
import IncomeExpenseChart from "@/components/dashboard/IncomeExpenseChart";
import RecentTransactions from "@/components/dashboard/RecentTransactions";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import HouseholdViewSwitcher from "@/components/dashboard/HouseholdViewSwitcher";
import MemberBreakdown from "@/components/dashboard/MemberBreakdown";
import IconDonutChart from "@/components/dashboard/IconDonutChart";
import { getCategoryIconMap } from "@/services/categories";
import TypePieChart from "@/components/dashboard/TypePieChart";
import { MemberOption } from "@/components/dashboard/MemberAvatarSelector";
import DashboardFilters from "@/components/dashboard/DashboardFilters";
import PeriodSwitcher from "@/components/dashboard/PeriodSwitcher";
import StackedExpenseChart from "@/components/dashboard/StackedExpenseChart";
import CategoryBreakdownChart from "@/components/dashboard/CategoryBreakdownChart";
import { getCardsWithBalance } from "@/services/creditCards";
import AiInsightCard from "@/components/dashboard/AiInsightCard";

async function getServerLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get("app_locale")?.value as Locale | undefined;
  return localeCookie === "en" ? "en" : "th";
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    household?: string;
    members?: string;
    from?: string;
    to?: string;
    period?: string;
  }>;
}) {
  const {
    household: selectedHouseholdId,
    members: membersParam,
    from,
    to,
    period,
  } = await searchParams;

  const defaultRange = getDefaultDateRange();
  const dateFrom = from ?? defaultRange.from;
  const dateTo = to ?? defaultRange.to;
  const granularity: PeriodGranularity =
    period === "day" || period === "week" || period === "year" ? period : "month";

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const currentUserId = userData?.user?.id ?? "";

  const selectedMemberIds = membersParam ? membersParam.split(",").filter(Boolean) : [];

  const transactions = await getTransactions(supabase, {
    householdId: selectedHouseholdId || undefined,
    userIds: selectedMemberIds.length > 0 ? selectedMemberIds : undefined,
    dateFrom,
    dateTo,
  });
  const kpis = calculateKpis(transactions);
  const cashBalance = calculateCashBalance(transactions);
  const settings = userData?.user
    ? await getUserSettings(supabase, userData.user.id)
    : null;
  const currency = settings?.currency ?? "THB";
  const locale = await getServerLocale();
  const t = translations[locale];

  const households = await getUserHouseholds(supabase);

  const recentTransactions = transactions.slice(0, 5);
  const recentUserIds = recentTransactions.map((tx) => tx.user_id);
  const displayNames = await getDisplayNamesByUserIds(supabase, recentUserIds);

  const isHouseholdView = !!selectedHouseholdId;
  let memberBreakdown: ReturnType<typeof calculateMemberBreakdown> = [];
  let breakdownNames: Record<string, string> = {};
  let memberOptions: MemberOption[] = [];

  if (isHouseholdView) {
    memberBreakdown = calculateMemberBreakdown(transactions);
    const breakdownUserIds = memberBreakdown.map((b) => b.userId);
    breakdownNames = await getDisplayNamesByUserIds(supabase, breakdownUserIds);

    const householdMembers = await getHouseholdMembers(supabase, selectedHouseholdId!);
    const allMemberIds = householdMembers.map((m) => m.user_id);
    const profiles = await getUserProfilesByIds(supabase, allMemberIds);

    memberOptions = householdMembers.map((m) => ({
      userId: m.user_id,
      name: profiles[m.user_id]?.name ?? m.user_id.slice(0, 8),
      avatarUrl: profiles[m.user_id]?.avatarUrl ?? null,
      isYou: m.user_id === currentUserId,
    }));
  }

  const categoryBreakdown = calculateCategoryBreakdown(transactions);
  const categoryIconMap = await getCategoryIconMap(supabase);
  const creditCards = await getCardsWithBalance(supabase);
  const typeBreakdown = calculateTypeBreakdown(transactions);
  const filteredForChart = transactions.filter((tx) => tx.date >= dateFrom && tx.date <= dateTo);
  const { data: stackedData, categories: stackedCategories } = calculateStackedBarData(
    filteredForChart,
    granularity
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <DashboardHeader />
        <HouseholdViewSwitcher
          households={households}
          selectedHouseholdId={selectedHouseholdId ?? ""}
        />
      </div>

       <DashboardFilters
        defaultFrom={dateFrom}
        defaultTo={dateTo}
        showMemberSelector={isHouseholdView}
        memberOptions={memberOptions}
        selectedMemberIds={selectedMemberIds}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          titleKey="totalIncome"
          value={formatCurrency(kpis.totalIncome, currency)}
          accent="green"
          locale={locale}
        />
        <KpiCard
          titleKey="totalExpense"
          value={formatCurrency(kpis.totalExpense, currency)}
          accent="red"
          locale={locale}
        />
        <KpiCard
          titleKey="cashBalance"
          value={formatCurrency(cashBalance, currency)}
          accent="slate"
          locale={locale}
        />
        <KpiCard
          titleKey="netBalance"
          value={formatCurrency(kpis.balance, currency)}
          accent="blue"
          locale={locale}
        />

        
      </div>
      
      {creditCards.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {creditCards.map((card) => (
            <div
              key={card.id}
              className="p-5 rounded-2xl text-white shadow-md relative overflow-hidden"
              style={{ background: `linear-gradient(135deg, ${card.color}dd, ${card.color}88)` }}
            >
              <div className="absolute top-0 right-0 w-20 h-20 rounded-full bg-white/10 -translate-y-6 translate-x-6" />
              <p className="text-xs text-white/70 uppercase tracking-wide font-medium mb-1">💳 {card.name}</p>
              <p className="text-2xl font-bold">
                {formatCurrency(card.balance, currency)}
              </p>
              {card.card_type === "credit" && (
                <p className="text-xs text-white/70 mt-1">
                  {t.dashboard.remaining} {formatCurrency(card.available, currency)} {t.dashboard.of} {formatCurrency(card.credit_limit, currency)}
                </p>
              )}
              <div className="mt-3 w-full bg-white/20 h-1 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full"
                  style={{
                    width: `${Math.min(100, card.credit_limit > 0 ? (card.balance / card.credit_limit) * 100 : 0)}%`
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {t.dashboard.expenseTrend}
          </h2>
          <PeriodSwitcher selectedPeriod={granularity} />
        </div>
        <StackedExpenseChart
          data={stackedData}
          categories={stackedCategories}
          currency={currency}
          emptyLabel={t.transactions.noTransactions}
          iconMap={categoryIconMap}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
            {t.dashboard.incomeVsExpense}
          </h2>
          <IncomeExpenseChart transactions={transactions} />
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
            {t.dashboard.incomeVsExpenseRatio}
          </h2>
          <TypePieChart
            data={typeBreakdown}
            currency={currency}
            labels={{ income: t.dashboard.income, expense: t.dashboard.expense }}
            emptyLabel={t.transactions.noTransactions}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
            {t.dashboard.expenseByCategory}
          </h2>
          <IconDonutChart
            data={categoryBreakdown}
            iconMap={categoryIconMap}
            currency={currency}
            totalLabel={t.dashboard.totalExpense}
            emptyLabel={t.transactions.noTransactions}
          />
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {t.dashboard.categoryShare}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {t.dashboard.categoryShareSubtitle}
            </p>
          </div>
          <CategoryBreakdownChart
            data={categoryBreakdown}
            iconMap={categoryIconMap}
            currency={currency}
            emptyLabel={t.transactions.noTransactions}
          />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
          {t.dashboard.recentTransactions}
        </h2>
        <RecentTransactions
          transactions={recentTransactions}
          currency={currency}
          displayNames={displayNames}
          currentUserId={currentUserId}
          categoryIconMap={categoryIconMap}
        />
      </div>

      {isHouseholdView && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
            {t.dashboard.spendingByMember}
          </h2>
          <MemberBreakdown
            breakdown={memberBreakdown}
            displayNames={breakdownNames}
            currentUserId={currentUserId}
            currency={currency}
          />
        </div>
      )}
       {/* AI Assistant Shortcuts */}
        <AiInsightCard
        kpis={kpis}
        topCategories={categoryBreakdown.slice(0, 5)}
        period={locale === "th" ? `${dateFrom} ถึง ${dateTo}` : `${dateFrom} to ${dateTo}`}
        />
    </div>
  );
}