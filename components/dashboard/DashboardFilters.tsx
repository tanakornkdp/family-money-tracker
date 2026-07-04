import { MemberOption } from "./MemberAvatarSelector";
import MemberAvatarSelector from "./MemberAvatarSelector";
import DateRangeFilter from "./DateRangeFilter";
import { translations, Locale } from "@/lib/i18n/translations";
import { cookies } from "next/headers";

async function getServerLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get("app_locale")?.value as Locale | undefined;
  return localeCookie === "en" ? "en" : "th";
}

export default async function DashboardFilters({
  defaultFrom,
  defaultTo,
  showMemberSelector,
  memberOptions,
  selectedMemberIds,
}: {
  defaultFrom: string;
  defaultTo: string;
  showMemberSelector: boolean;
  memberOptions: MemberOption[];
  selectedMemberIds: string[];
}) {
  const locale = await getServerLocale();
  const t = translations[locale];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-600 dark:text-slate-400 invisible select-none">
            placeholder
          </span>
          <DateRangeFilter defaultFrom={defaultFrom} defaultTo={defaultTo} />
        </div>

        {showMemberSelector && memberOptions.length > 0 && (
          <div className="flex flex-col gap-1.5 lg:items-end">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {t.dashboard.filterByMember}
            </span>
            <MemberAvatarSelector members={memberOptions} selectedMemberIds={selectedMemberIds} />
          </div>
        )}
      </div>
    </div>
  );
}