"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import { Transaction } from "@/types";
import { getLastNMonths, getMonthKey } from "@/lib/utils/dateHelpers";

export default function IncomeExpenseChart({
  transactions,
}: {
  transactions: Transaction[];
}) {
  const months = getLastNMonths(6);

  const data = months.map((month) => {
    const monthTransactions = transactions.filter(
      (t) => getMonthKey(t.date) === month
    );

    const income = monthTransactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const expense = monthTransactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    return { month, income, expense };
  });

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
        <YAxis stroke="#64748b" fontSize={12} />
        <Tooltip />
        <Legend />
        <Bar dataKey="income" fill="#22c55e" radius={[6, 6, 0, 0]} name="Income" />
        <Bar dataKey="expense" fill="#ef4444" radius={[6, 6, 0, 0]} name="Expense" />
      </BarChart>
    </ResponsiveContainer>
  );
}