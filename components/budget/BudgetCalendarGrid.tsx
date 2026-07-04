"use client";

import { DailyBudgetStatus } from "@/types";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import clsx from "clsx";

export default function BudgetCalendarGrid({
  year,
  month,
  statuses,
  currency,
  onSelectDay,
  selectedDate,
}: {
  year: number;
  month: number;
  statuses: Map<string, DailyBudgetStatus>;
  currency: string;
  onSelectDay: (date: string) => void;
  selectedDate: string | null;
}) {
  const { t, locale } = useLanguage();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startWeekday = firstDay.getDay();

  const weekdayLabels =
    t === undefined
      ? []
      : locale === "th"
      ? ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"]
      : ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  const cells: (number | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekdayLabels.map((w) => (
          <div
            key={w}
            className="text-center text-xs font-medium text-slate-500 dark:text-slate-400 py-1"
          >
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {cells.map((day, idx) => {
          if (day === null) return <div key={`empty-${idx}`} />;

          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const status = statuses.get(dateStr);
          const isSelected = selectedDate === dateStr;
          const todayStr = new Date().toISOString().split("T")[0];
          const isToday = dateStr === todayStr;

          return (
            <button
              key={dateStr}
              onClick={() => status && onSelectDay(dateStr)}
              disabled={!status}
              className={clsx(
                "aspect-square rounded-2xl flex flex-col items-start justify-start p-2 text-xs transition",
                "border-2",
                isToday && !isSelected
                  ? "border-amber-400 bg-amber-50 dark:bg-amber-950/20"
                  : isSelected
                  ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/20"
                  : status
                  ? "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-600"
                  : "border-slate-100 dark:border-slate-800 opacity-30 cursor-default bg-transparent"
              )}
            >
              <span className={clsx(
                "font-bold text-sm leading-none",
                isToday
                  ? "text-amber-600 dark:text-amber-400"
                  : isSelected
                  ? "text-indigo-600 dark:text-indigo-400"
                  : "text-slate-700 dark:text-slate-300"
              )}>
                {day}
              </span>
              {status && (
                <span
                  className={clsx(
                    "text-[11px] font-semibold mt-auto leading-tight",
                    status.isOverBudget
                      ? "text-red-500 dark:text-red-400"
                      : "text-emerald-600 dark:text-emerald-400"
                  )}
                >
                  {status.isOverBudget ? "-" : "+"}
                  {formatCurrency(Math.abs(status.remaining), currency).replace(/[^\d.,]/g, "")}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}