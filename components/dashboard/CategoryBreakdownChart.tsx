"use client";

import { CategoryBreakdown } from "@/services/transactions";
import { formatCurrency } from "@/lib/utils/formatCurrency";

const BAR_COLORS = [
  "bg-indigo-500",
  "bg-emerald-500",
  "bg-orange-500",
  "bg-purple-500",
  "bg-rose-500",
  "bg-cyan-500",
  "bg-amber-500",
  "bg-pink-500",
  "bg-slate-500",
  "bg-teal-500",
];

export default function CategoryBreakdownChart({
  data,
  iconMap,
  currency,
  emptyLabel,
}: {
  data: CategoryBreakdown[];
  iconMap: Record<string, string>;
  currency: string;
  emptyLabel: string;
}) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400 py-8 text-center">
        {emptyLabel}
      </p>
    );
  }

  const sorted = [...data].sort((a, b) => b.amount - a.amount);
  const maxAmount = sorted[0].amount;

  return (
    <div className="space-y-4 max-h-[320px] overflow-y-auto pr-1">
      {sorted.map((item, idx) => {
        const barColor = BAR_COLORS[idx % BAR_COLORS.length];
        const widthPercent = Math.min(100, (item.amount / maxAmount) * 100);

        return (
          <div key={item.category} className="space-y-1.5">
            <div className="flex justify-between items-center text-xs font-medium">
              <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                <span>{iconMap[item.category] ?? "💰"}</span>
                <span>{item.category}</span>
              </span>
              <span className="font-mono text-slate-600 dark:text-slate-400">
                {formatCurrency(item.amount, currency)} ({item.percentage.toFixed(0)}%)
              </span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${barColor} transition-all duration-700`}
                style={{ width: `${widthPercent}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}