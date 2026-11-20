/**
 * Read ordered PostgREST ranges without silently accepting the default row cap.
 * The factory must return a fresh query with stable ordering (including a unique
 * tie breaker). Keeping this module native JS also permits network-free node:test.
 * @template T
 * @param {(from: number, to: number) => PromiseLike<{ data: T[] | null, error: { message: string } | null }>} loadPage
 * @param {{ pageSize?: number, limit?: number }} [options]
 * @returns {Promise<T[]>}
 */
export async function fetchAllRows(loadPage, { pageSize = 1000, limit } = {}) {
  if (!Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 1000) throw new RangeError("pageSize must be an integer between 1 and 1000");
  if (limit !== undefined && (!Number.isSafeInteger(limit) || limit < 0)) throw new RangeError("limit must be a nonnegative safe integer");
  /** @type {T[]} */
  const rows = [];
  while (limit === undefined || rows.length < limit) {
    const size = limit === undefined ? pageSize : Math.min(pageSize, limit - rows.length);
    const { data, error } = await loadPage(rows.length, rows.length + size - 1);
    if (error) throw new Error(error.message, { cause: error });
    const page = data ?? [];
    if (page.length > size) throw new Error("Range query returned more rows than requested");
    rows.push(...page);
    if (page.length < size) break;
  }
  return rows;
}
