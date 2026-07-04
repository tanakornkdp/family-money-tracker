"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { CategoryBreakdown } from "@/services/transactions";
import { formatCurrency } from "@/lib/utils/formatCurrency";

const COLORS = [
  "#3b82f6",
  "#22c55e",
  "#f97316",
  "#a855f7",
  "#ef4444",
  "#06b6d4",
  "#eab308",
  "#ec4899",
  "#64748b",
  "#14b8a6",
];

export default function CategoryPieChart({
  data,
  currency = "THB",
  emptyLabel,
}: {
  data: CategoryBreakdown[];
  currency?: string;
  emptyLabel: string;
}) {
  if (data.length === 0) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">{emptyLabel}</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          dataKey="amount"
          nameKey="category"
          cx="50%"
          cy="50%"
          outerRadius={90}
          label={({ percent }) => `${((percent ?? 0) * 100).toFixed(0)}%`}
        >
          {data.map((_, index) => (
            <Cell key={index} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => formatCurrency(Number(value), currency)} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}