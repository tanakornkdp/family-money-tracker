"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { PeriodGranularity } from "@/lib/utils/dateHelpers";
import clsx from "clsx";

export default function PeriodSwitcher({
  selectedPeriod,
}: {
  selectedPeriod: PeriodGranularity;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { t } = useLanguage();

  const periods: { value: PeriodGranularity; label: string }[] = [
    { value: "day", label: t.dashboard.periodDay },
    { value: "week", label: t.dashboard.periodWeek },
    { value: "month", label: t.dashboard.periodMonth },
    { value: "year", label: t.dashboard.periodYear },
  ];

  const handleChange = (period: PeriodGranularity) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", period);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex gap-1 rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
      {periods.map((p) => (
        <button
          key={p.value}
          onClick={() => handleChange(p.value)}
          className={clsx(
            "px-3 py-1.5 rounded-lg text-sm font-medium transition",
            selectedPeriod === p.value
              ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          )}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}