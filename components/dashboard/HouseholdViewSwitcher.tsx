"use client";

import { useRouter, usePathname } from "next/navigation";
import { Household } from "@/types";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

export default function HouseholdViewSwitcher({
  households,
  selectedHouseholdId,
}: {
  households: Household[];
  selectedHouseholdId: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useLanguage();

  if (households.length === 0) return null;

  const handleChange = (value: string) => {
    if (value) {
      router.push(`${pathname}?household=${value}`);
    } else {
      router.push(pathname);
    }
  };

  return (
    <select
      value={selectedHouseholdId}
      onChange={(e) => handleChange(e.target.value)}
      className="rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
    >
      <option value="">{t.dashboard.viewAll}</option>
      {households.map((h) => (
        <option key={h.id} value={h.id}>
          {h.name}
        </option>
      ))}
    </select>
  );
}