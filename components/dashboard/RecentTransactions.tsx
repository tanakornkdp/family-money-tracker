import { Transaction } from "@/types";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { formatDate } from "@/lib/utils/dateHelpers";
import { translations, Locale } from "@/lib/i18n/translations";
import { cookies } from "next/headers";
import clsx from "clsx";

async function getServerLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get("app_locale")?.value as Locale | undefined;
  return localeCookie === "en" ? "en" : "th";
}

export default async function RecentTransactions({
  transactions,
  currency = "THB",
  displayNames = {},
  currentUserId,
  categoryIconMap = {},
}: {
  transactions: Transaction[];
  currency?: string;
  displayNames?: Record<string, string>;
  currentUserId?: string;
  categoryIconMap?: Record<string, string>;
}) {
  const locale = await getServerLocale();
  const t = translations[locale];

  const getOwnerLabel = (userId: string) => {
    if (userId === currentUserId) return t.household.you;
    const name = displayNames[userId];
    return name || userId.slice(0, 8);
  };

  if (transactions.length === 0) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">{t.transactions.noTransactions}</p>;
  }

  return (
    <ul className="space-y-3">
      {transactions.map((tx) => (
        <li key={tx.id} className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
              {categoryIconMap[tx.category] ?? "💰"} {tx.title}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {tx.category} · {formatDate(tx.date)} · {getOwnerLabel(tx.user_id)}
            </p>
          </div>
          <span
            className={clsx(
              "text-sm font-semibold",
              tx.type === "income" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
            )}
          >
            {tx.type === "income" ? "+" : "-"}
            {formatCurrency(Number(tx.amount), currency)}
          </span>
        </li>
      ))}
    </ul>
  );
}