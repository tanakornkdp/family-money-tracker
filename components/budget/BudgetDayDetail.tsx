import { cookies } from "next/headers";
import { DailyBudgetStatus, Transaction } from "@/types";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { formatDate } from "@/lib/utils/dateHelpers";
import { translations, Locale } from "@/lib/i18n/translations";

async function getServerLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get("app_locale")?.value as Locale | undefined;
  return localeCookie === "en" ? "en" : "th";
}

export default async function BudgetDayDetail({
  status,
  transactions,
  currency,
}: {
  status: DailyBudgetStatus | null;
  transactions: Transaction[];
  currency: string;
}) {
  const locale = await getServerLocale();
  const t = translations[locale];

  if (!status) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">{t.budget.noActivePlan}</p>;
  }

  const dayTransactions = transactions.filter((tx) => tx.date === status.date && tx.type === "expense");

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-slate-500 dark:text-slate-400">{formatDate(status.date)}</p>
        <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          {t.budget.dayDetail}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3">
          <p className="text-xs text-slate-500 dark:text-slate-400">{t.budget.dailyAllowance}</p>
          <p className="font-semibold text-slate-900 dark:text-slate-100">
            {formatCurrency(status.dailyAllowance, currency)}
          </p>
        </div>
        <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3">
          <p className="text-xs text-slate-500 dark:text-slate-400">{t.budget.spent}</p>
          <p className="font-semibold text-slate-900 dark:text-slate-100">
            {formatCurrency(status.spentAmount, currency)}
          </p>
        </div>
      </div>

      <div
        className={`rounded-xl p-3 ${
          status.isOverBudget
            ? "bg-red-50 dark:bg-red-950/40"
            : "bg-green-50 dark:bg-green-950/40"
        }`}
      >
        <p className="text-xs text-slate-600 dark:text-slate-400">
          {status.isOverBudget ? t.budget.overBudget : t.budget.remaining}
        </p>
        <p
          className={`text-xl font-bold ${
            status.isOverBudget
              ? "text-red-600 dark:text-red-400"
              : "text-green-600 dark:text-green-400"
          }`}
        >
          {formatCurrency(Math.abs(status.remaining), currency)}
        </p>
      </div>

      <div>
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          {t.transactions.allTransactions}
        </p>
        {dayTransactions.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t.budget.noTransactionsThisDay}
          </p>
        ) : (
          <ul className="space-y-2">
            {dayTransactions.map((tx) => (
              <li key={tx.id} className="flex justify-between text-sm">
                <span className="text-slate-700 dark:text-slate-300">{tx.title}</span>
                <span className="font-medium text-red-600 dark:text-red-400">
                  -{formatCurrency(Number(tx.amount), currency)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}