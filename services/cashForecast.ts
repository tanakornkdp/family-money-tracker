import type { Transaction } from "@/types";
import { getUpcomingOccurrences, type RecurringBill } from "@/services/recurringBills";

export interface MonthEndForecastInput {
  today: string;
  currentBalance: number;
  transactions: Transaction[];
  recurringItems: RecurringBill[];
  householdId?: string;
}

export interface MonthEndForecastResult {
  currentBalance: number;
  scheduledIncome: number;
  scheduledExpense: number;
  variableIncomeEstimate: number;
  variableExpenseEstimate: number;
  estimate: number;
  variableEstimateAvailable: boolean;
  daysRemaining: number;
}

export function getBangkokDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const part = (type: "year" | "month" | "day") => parts.find((item) => item.type === type)?.value ?? "00";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function calculateMonthEndForecast(input: MonthEndForecastInput): MonthEndForecastResult {
  const [year, month, day] = input.today.split("-").map(Number);
  const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
  const monthEnd = `${year}-${String(month).padStart(2, "0")}-${String(new Date(year, month, 0).getDate()).padStart(2, "0")}`;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const daysRemaining = Math.max(0, daysInMonth - day);
  const paidOccurrences = new Set(input.transactions
    .filter((transaction) => transaction.recurring_bill_id && transaction.recurring_occurrence_date)
    .map((transaction) => `${transaction.recurring_bill_id}:${transaction.recurring_occurrence_date}`));
  const upcoming = getUpcomingOccurrences(input.recurringItems, input.today, monthEnd, input.householdId);
  const unpaid = upcoming.filter(({ date, bill }) => !paidOccurrences.has(`${bill.id}:${date}`));
  const scheduledIncome = unpaid.filter(({ bill }) => bill.type === "income").reduce((sum, { bill }) => sum + Number(bill.amount), 0);
  const scheduledExpense = unpaid.filter(({ bill }) => bill.type === "expense").reduce((sum, { bill }) => sum + Number(bill.amount), 0);

  const variableTransactions = input.transactions.filter((transaction) =>
    transaction.date >= monthStart && transaction.date <= input.today &&
    !transaction.recurring_bill_id && transaction.category !== "เติมเงินวอลเล็ต"
  );
  const variableEstimateAvailable = day >= 7 && variableTransactions.length >= 3 && daysRemaining > 0;
  const average = (type: "income" | "expense") => variableTransactions
    .filter((transaction) => transaction.type === type)
    .reduce((sum, transaction) => sum + Number(transaction.amount), 0) / Math.max(day, 1);
  const variableIncomeEstimate = variableEstimateAvailable ? average("income") * daysRemaining : 0;
  const variableExpenseEstimate = variableEstimateAvailable ? average("expense") * daysRemaining : 0;

  return {
    currentBalance: input.currentBalance,
    scheduledIncome,
    scheduledExpense,
    variableIncomeEstimate,
    variableExpenseEstimate,
    estimate: input.currentBalance + scheduledIncome - scheduledExpense + variableIncomeEstimate - variableExpenseEstimate,
    variableEstimateAvailable,
    daysRemaining,
  };
}
