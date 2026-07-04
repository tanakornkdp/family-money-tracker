"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import Button from "@/components/ui/Button";

export default function DateRangeFilter({
  defaultFrom,
  defaultTo,
}: {
  defaultFrom: string;
  defaultTo: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { t } = useLanguage();

  const [from, setFrom] = useState(searchParams.get("from") ?? defaultFrom);
  const [to, setTo] = useState(searchParams.get("to") ?? defaultTo);

  const applyFilter = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("from", from);
    params.set("to", to);
    router.push(`${pathname}?${params.toString()}`);
  };

  const resetFilter = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("from");
    params.delete("to");
    setFrom(defaultFrom);
    setTo(defaultTo);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
          {t.dashboard.dateFrom}
        </label>
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
          {t.dashboard.dateTo}
        </label>
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      <Button onClick={applyFilter}>{t.dashboard.applyDateRange}</Button>
      <Button variant="secondary" onClick={resetFilter}>
        {t.dashboard.resetDateRange}
      </Button>
    </div>
  );
}