import type { Transaction } from "@/types";

/** Preserve query semantics, order and the existing default-range cash KPI. */
export function selectDashboardTransactions(allScopeTransactions: Transaction[], dateFrom: string, dateTo: string, hasExplicitDateRange: boolean) {
  const transactions = allScopeTransactions.filter(transaction => (!dateFrom || transaction.date >= dateFrom) && (!dateTo || transaction.date <= dateTo));
  return { transactions, balanceTransactions: hasExplicitDateRange ? allScopeTransactions : transactions };
}

export function canDeriveDashboardRange(from: string, to: string): boolean {
  return [from, to].every(value => !value || (/^\d{4}-\d{2}-\d{2}$/.test(value) && value >= "0001-01-01" && Number.isFinite(Date.parse(value + "T00:00:00Z")) && new Date(value + "T00:00:00Z").toISOString().slice(0, 10) === value));
}
