"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  TooltipProps,
  Cell,
} from "recharts";
import { StackedBarPoint } from "@/services/transactions";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import Modal from "@/components/ui/Modal";

const COLORS = [
  "#3b82f6", "#22c55e", "#f97316", "#a855f7", "#ef4444",
  "#06b6d4", "#eab308", "#ec4899", "#64748b", "#14b8a6",
];

function CustomTooltip({
  active, payload, label, currency, iconMap,
}: {
  active?: boolean;
  payload?: readonly { dataKey?: string | number; value?: string | number; color?: string }[];
  label?: string;
  currency: string;
  iconMap: Record<string, string>;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const nonZeroEntries = payload.filter((entry) => Number(entry.value) > 0);
  if (nonZeroEntries.length === 0) return null;

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 shadow-xl text-sm max-h-64 overflow-y-auto relative z-50">
      <p className="font-medium text-slate-900 dark:text-slate-100 mb-2 sticky top-0 bg-white dark:bg-slate-800">
        {label}
      </p>
      <div className="space-y-1">
        {nonZeroEntries.map((entry) => (
          <div key={entry.dataKey} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
              <span className="shrink-0">{iconMap[String(entry.dataKey)] ?? "💰"}</span>
              <span className="text-slate-600 dark:text-slate-400">{entry.dataKey}</span>
            </div>
            <span className="font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
              {formatCurrency(Number(entry.value), currency)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface ClickedBarData {
  label: string;
  entries: { category: string; amount: number; color: string }[];
  total: number;
}

export default function StackedExpenseChart({
  data,
  categories,
  currency = "THB",
  emptyLabel,
  iconMap = {},
}: {
  data: StackedBarPoint[];
  categories: string[];
  currency?: string;
  emptyLabel: string;
  iconMap?: Record<string, string>;
}) {
  const [clickedBar, setClickedBar] = useState<ClickedBarData | null>(null);

  if (data.length === 0 || categories.length === 0) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">{emptyLabel}</p>;
  }

  const handleBarClick = (barData: unknown) => {
    const payload = ((barData as Record<string, unknown> | null)?.payload ?? barData) as Record<string, unknown>;
    
    const entries = categories
      .map((cat, index) => ({
        category: cat,
        amount: Number(payload[cat] ?? 0),
        color: COLORS[index % COLORS.length],
      }))
      .filter((e) => e.amount > 0)
      .sort((a, b) => b.amount - a.amount);

    const total = entries.reduce((sum, e) => sum + e.amount, 0);

    setClickedBar({
      label: String(payload.label ?? ""),
      entries,
      total,
    });
  };

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={380}>
        <BarChart
          data={data}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          barCategoryGap={data.length === 1 ? "70%" : "20%"}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="label" stroke="#64748b" fontSize={12} />
          <YAxis stroke="#64748b" fontSize={12} />
          <Tooltip content={(props) => <CustomTooltip {...(props as Record<string, unknown>)} currency={currency} iconMap={iconMap} />} />
          {categories.map((cat, index) => (
            <Bar
              key={cat}
              dataKey={cat}
              stackId="expenses"
              fill={COLORS[index % COLORS.length]}
              radius={index === categories.length - 1 ? [6, 6, 0, 0] : [0, 0, 0, 0]}
              style={{ cursor: "pointer" }}
              onClick={(barData) => handleBarClick(barData as unknown as StackedBarPoint)}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>

      <Modal
        open={!!clickedBar}
        onClose={() => setClickedBar(null)}
        title={clickedBar?.label || ""}
      >
        {clickedBar && (
          <div className="space-y-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              รวม {formatCurrency(clickedBar.total, currency)}
            </p>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {clickedBar.entries.map((entry) => {
                const pct = clickedBar.total > 0 ? ((entry.amount / clickedBar.total) * 100).toFixed(1) : "0";
                return (
                  <div key={entry.category} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                        <span>{iconMap[entry.category] ?? "💰"}</span>
                        <span className="text-slate-700 dark:text-slate-300 font-medium">{entry.category}</span>
                      </span>
                      <span className="text-slate-600 dark:text-slate-400 font-mono text-xs">
                        {formatCurrency(entry.amount, currency)} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${(entry.amount / clickedBar.entries[0].amount) * 100}%`,
                          backgroundColor: entry.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}