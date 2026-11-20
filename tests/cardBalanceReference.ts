// Test oracle only. Production balances are calculated by the RLS-aware SQL RPC.
export function referenceCardBalances(
  cards: readonly { id: string; card_type: "debit" | "credit" }[],
  transactions: readonly { id: string; card_id: string | null; amount: number | string; type: string; category: string }[],
  excludedId?: string,
): Record<string, number> {
  const balances: Record<string, number> = Object.fromEntries(cards.map(card => [card.id, 0]));
  const types = new Map(cards.map(card => [card.id, card.card_type]));
  for (const tx of transactions) {
    if (!tx.card_id || !types.has(tx.card_id) || (excludedId && tx.id === excludedId)) continue;
    if (types.get(tx.card_id) === "debit") {
      if (tx.category === "เติมเงินวอลเล็ต") balances[tx.card_id] += Number(tx.amount);
      else if (tx.type === "expense") balances[tx.card_id] -= Number(tx.amount);
    } else if (tx.type === "expense") balances[tx.card_id] += Number(tx.amount);
    else if (tx.type === "income") balances[tx.card_id] -= Number(tx.amount);
  }
  return balances;
}
