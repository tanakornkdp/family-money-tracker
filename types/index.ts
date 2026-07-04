export * from "./database";

export interface KpiSummary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  transactionCount: number;
}