export type TripPerson = { id: string; name: string; accountId?: string };
export type TripSplit = { payer: string; shares: string[] };
export type TripSettlement = { people: TripPerson[]; splits: Record<string, TripSplit> };

export function settleTrip(people: TripPerson[], expenses: { id: string; cents: number }[], splits: TripSettlement["splits"], paid: { from: string; to: string; cents: number }[] = []) {
  const balances = new Map(people.map(({ id }) => [id, 0]));
  let pending = 0;
  for (const { id, cents } of expenses) {
    const split = splits[id];
    const shares = [...new Set(split?.shares ?? [])].sort();
    if (!split || !balances.has(split.payer) || !shares.length || shares.some(key => !balances.has(key))) {
      pending++;
      continue;
    }
    balances.set(split.payer, balances.get(split.payer)! + cents);
    shares.forEach((key, index) => {
      const part = Math.floor(cents / shares.length) + Number(index < cents % shares.length);
      balances.set(key, balances.get(key)! - part);
    });
  }
  for (const { from, to, cents } of paid) {
    if (!balances.has(from) || !balances.has(to)) continue;
    balances.set(from, balances.get(from)! + cents);
    balances.set(to, balances.get(to)! - cents);
  }
  const debtors = [...balances].filter(([, value]) => value < 0);
  const creditors = [...balances].filter(([, value]) => value > 0);
  const transfers: { from: string; to: string; cents: number }[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const cents = Math.min(-debtor[1], creditor[1]);
    transfers.push({ from: debtor[0], to: creditor[0], cents });
    debtor[1] += cents;
    creditor[1] -= cents;
    if (!debtor[1]) i++;
    if (!creditor[1]) j++;
  }
  return { pending, transfers };
}
