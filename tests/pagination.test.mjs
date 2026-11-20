import { test } from "node:test";
import assert from "node:assert/strict";
import { fetchAllRows } from "../lib/utils/pagination.mjs";

test("returns all rows, including more than 1000 with equal dates/timestamps", async () => {
  const rows = Array.from({ length: 2501 }, (_, id) => ({ id, date: "2026-11-20", created_at: "2026-11-20T00:00:00Z" }));
  const ranges = [];
  const result = await fetchAllRows(async (from, to) => { ranges.push([from, to]); return { data: rows.slice(from, to + 1), error: null }; });
  assert.deepEqual(result, rows);
  assert.deepEqual(ranges, [[0, 999], [1000, 1999], [2000, 2999]]);
});
test("exact multiples require a final empty page; null and empty results terminate", async () => {
  let calls = 0;
  assert.equal((await fetchAllRows(async (from, to) => { calls++; return { data: Array.from({ length: 1000 }, (_, id) => id).slice(from, to + 1), error: null }; })).length, 1000);
  assert.equal(calls, 2);
  assert.deepEqual(await fetchAllRows(async () => ({ data: null, error: null })), []);
});
test("honours explicit limits without an unnecessary final request", async () => {
  const ranges = [];
  const result = await fetchAllRows(async (from, to) => { ranges.push([from, to]); return { data: Array.from({ length: to - from + 1 }, (_, i) => from + i), error: null }; }, { limit: 1500 });
  assert.equal(result.length, 1500);
  assert.deepEqual(ranges, [[0, 999], [1000, 1499]]);
  assert.deepEqual(await fetchAllRows(() => { throw new Error("must not query"); }, { limit: 0 }), []);
});
test("does not return partial results after a later page fails", async () => {
  await assert.rejects(fetchAllRows(async from => from ? { data: null, error: { message: "page failed" } } : { data: [1, 2], error: null }, { pageSize: 2 }), /page failed/);
});
test("rejects invalid pagination options and a query that ignored range", async () => {
  for (const options of [{ pageSize: 0 }, { pageSize: 1001 }, { pageSize: NaN }, { pageSize: 1.5 }, { limit: -1 }, { limit: Infinity }]) await assert.rejects(fetchAllRows(async () => ({ data: [], error: null }), options), RangeError);
  await assert.rejects(fetchAllRows(async () => ({ data: [1, 2], error: null }), { pageSize: 1 }), /more rows/);
});
