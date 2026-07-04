import { cookies } from "next/headers";
import { MemberBreakdown as MemberBreakdownType } from "@/services/transactions";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { translations, Locale } from "@/lib/i18n/translations";

async function getServerLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get("app_locale")?.value as Locale | undefined;
  return localeCookie === "en" ? "en" : "th";
}

export default async function MemberBreakdown({
  breakdown,
  displayNames,
  currentUserId,
  currency,
}: {
  breakdown: MemberBreakdownType[];
  displayNames: Record<string, string>;
  currentUserId: string;
  currency: string;
}) {
  const locale = await getServerLocale();
  const t = translations[locale];

  const getLabel = (userId: string) => {
    if (userId === currentUserId) return t.household.you;
    return displayNames[userId] || userId.slice(0, 8);
  };

  if (breakdown.length === 0) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">{t.household.noMembers}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
            <th className="py-2 pr-4 font-medium">{t.household.members}</th>
            <th className="py-2 pr-4 font-medium">{t.dashboard.income}</th>
            <th className="py-2 pr-4 font-medium">{t.dashboard.expense}</th>
            <th className="py-2 pr-4 font-medium">{t.dashboard.transactions}</th>
          </tr>
        </thead>
        <tbody>
          {breakdown.map((b) => (
            <tr key={b.userId} className="border-b border-slate-100 dark:border-slate-800">
              <td className="py-3 pr-4 text-slate-900 dark:text-slate-100 font-medium">
                {getLabel(b.userId)}
              </td>
              <td className="py-3 pr-4 text-green-600 dark:text-green-400">
                {formatCurrency(b.totalIncome, currency)}
              </td>
              <td className="py-3 pr-4 text-red-600 dark:text-red-400">
                {formatCurrency(b.totalExpense, currency)}
              </td>
              <td className="py-3 pr-4 text-slate-600 dark:text-slate-400">
                {b.transactionCount}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}