import type { Transaction } from "@/types";

export interface TransactionFilterValues {
  query?: string;
  from?: string;
  to?: string;
  category?: string;
  account?: string;
  member?: string;
  type?: string;
}

export function filterTransactions(
  transactions: Transaction[],
  filters: TransactionFilterValues,
  displayNames: Record<string, string> = {},
  cardNames: Record<string, string> = {},
): Transaction[] {
  const needle = filters.query?.trim().toLocaleLowerCase() ?? "";
  return transactions.filter((transaction) => {
    const searchable = [transaction.title, transaction.category, displayNames[transaction.user_id] ?? "", cardNames[transaction.card_id ?? ""] ?? ""]
      .join(" ").toLocaleLowerCase();
    const accountKey = transaction.card_id ? `card:${transaction.card_id}` : `method:${transaction.payment_method ?? "cash"}`;
    return (!needle || searchable.includes(needle)) &&
      (!filters.from || transaction.date >= filters.from) &&
      (!filters.to || transaction.date <= filters.to) &&
      (!filters.category || filters.category === "all" || transaction.category === filters.category) &&
      (!filters.account || filters.account === "all" || accountKey === filters.account) &&
      (!filters.member || filters.member === "all" || transaction.user_id === filters.member) &&
      (!filters.type || filters.type === "all" || transaction.type === filters.type);
  });
}
