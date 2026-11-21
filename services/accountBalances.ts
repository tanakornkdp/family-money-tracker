import type { CreditCard, Transaction } from "@/types";

export interface ReconciliationAccount {
  key: string;
  name: string;
  balance: number;
}

export function getReconciliationAccounts(
  userId: string,
  transactions: Transaction[],
  cards: (CreditCard & { balance: number })[],
): ReconciliationAccount[] {
  const ownTransactions = transactions.filter((transaction) => transaction.user_id === userId);
  const totalFor = (method: "cash" | "bank_transfer") => ownTransactions
    .filter((transaction) => (transaction.payment_method ?? "cash") === method)
    .reduce((total, transaction) => total + (transaction.type === "income" ? 1 : -1) * Number(transaction.amount), 0);
  return reconciliationAccountsFromBalances(totalFor("cash"), totalFor("bank_transfer"), cards);
}

export function reconciliationAccountsFromBalances(cash: number, bank: number, cards: (CreditCard & { balance: number })[]): ReconciliationAccount[] {
  return [
    { key: "cash", name: "เงินสด", balance: cash },
    { key: "bank_transfer", name: "บัญชีธนาคาร / โอนเงิน", balance: bank },
    ...cards.map((card) => ({ key: `card:${card.id}`, name: card.name, balance: card.balance })),
  ];
}
