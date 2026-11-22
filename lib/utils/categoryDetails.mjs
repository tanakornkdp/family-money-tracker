/** Group only the already-authorized, filtered report rows. Never fetch a broader scope.
 * @template {{id: string, category: string, amount: number, date: string}} T
 * @param {T[]} rows
 * @returns {{category: string, amount: number, rows: T[]}[]}
 */
export function groupCategoryDetails(rows) {
  /** @type {Map<string, {category: string, amount: number, rows: T[]}>} */
  const groups = new Map();
  for (const row of rows) {
    if (!Number.isFinite(Number(row.amount)) || Number(row.amount) < 0) continue;
    const group = groups.get(row.category) ?? {category: row.category, amount: 0, rows: []};
    group.amount += Number(row.amount);
    group.rows.push(row);
    groups.set(row.category, group);
  }
  for (const group of groups.values()) group.rows.sort((a,b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
  return [...groups.values()].sort((a,b) => b.amount-a.amount || a.category.localeCompare(b.category));
}
