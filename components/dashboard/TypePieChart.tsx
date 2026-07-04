"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { TypeBreakdown } from "@/services/transactions";
import { formatCurrency } from "@/lib/utils/formatCurrency";

const TYPE_COLORS: Record<string, string> = {
  income: "#22c55e",
  expense: "#ef4444",
};

export default function TypePieChart({
  data,
  currency = "THB",
  labels,
  emptyLabel,
}: {
  data: TypeBreakdown[];
  currency?: string;
  labels: { income: string; expense: string };
  emptyLabel: string;
}) {
  if (data.length === 0) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">{emptyLabel}</p>;
  }

  const chartData = data.map((d) => ({
    ...d,
    label: d.type === "income" ? labels.income : labels.expense,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={chartData}
          dataKey="amount"
          nameKey="label"
          cx="50%"
          cy="50%"
          outerRadius={90}
          label={({ percent }) => `${((percent ?? 0) * 100).toFixed(0)}%`}
        >
          {chartData.map((entry, index) => (
            <Cell key={index} fill={TYPE_COLORS[entry.type]} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => formatCurrency(Number(value), currency)} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}