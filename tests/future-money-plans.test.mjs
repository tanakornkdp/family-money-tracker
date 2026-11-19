import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { futurePlanSchema, summarizeFuturePlan } from "../lib/validation/futureMoneyPlans.ts";
import { getAllFuturePlanLinks } from "../services/futureMoneyPlans.ts";
const itemId = randomUUID();
const plan = { name: "Year-end bonus", expected_amount: 100000, expected_date: "2026-12-25", household_id: null, allocations: [{ id: itemId, name: "Travel", amount: 20000, kind: "other", target: "" }], archived: false };
const tx = [{ id: "bonus", amount: 100000, type: "income" }, { id: "hotel", amount: 8000, type: "expense" }, { id: "unrelated", amount: 9999, type: "expense" }];
const links = [{ transaction_id: "bonus", allocation_id: null }, { transaction_id: "hotel", allocation_id: itemId }];
test("planning never changes actual records and only explicit links are counted", () => {
  const before = structuredClone(tx);
  assert.equal(summarizeFuturePlan(plan, [], tx, []).received, 0);
  const summary = summarizeFuturePlan(plan, links, tx, []);
  assert.equal(summary.received, 100000);
  assert.equal(summary.actual[itemId], 8000);
  assert.equal(summary.unallocated, 80000);
  assert.deepEqual(tx, before);
});
test("revised allocations preserve actual usage, including overspending", () => {
  const revised = { ...plan, allocations: [{ ...plan.allocations[0], amount: 5000 }] };
  const result = summarizeFuturePlan(revised, links, tx, []);
  assert.equal(result.actual[itemId], 8000);
  assert.equal(revised.allocations[0].amount - result.actual[itemId], -3000);
});
test("unlinking leaves actual records unchanged", () => {
  assert.equal(summarizeFuturePlan(plan, links.slice(0, 1), tx, []).used, 0);
  assert.equal(tx.find(t => t.id === "hotel").amount, 8000);
});
test("goal contributions are actual records, not current goal balances", () => {
  const goalPlan = { ...plan, allocations: [{ ...plan.allocations[0], kind: "goal", target: "goal" }] };
  const result = summarizeFuturePlan(goalPlan, [{ allocation_id: itemId, contribution_id: "saving" }], tx, [{ id: "saving", goal_id: "goal", amount: 250.25 }]);
  assert.equal(result.actual[itemId], 250.25);
});
test("edited category, trip and goal destinations no longer complete the old allocation", () => {
  for (const kind of ["category", "trip", "goal"]) {
    const revised = { ...plan, allocations: [{ ...plan.allocations[0], kind, target: "old" }] };
    const actual = kind === "goal" ? [{ id: "saving", goal_id: "new", amount: 100 }] : [];
    const linked = kind === "goal" ? [{ id: "link", allocation_id: itemId, contribution_id: "saving" }] : [{ id: "link", allocation_id: itemId, transaction_id: "hotel" }];
    const result = summarizeFuturePlan(revised, linked, tx.map(t => ({ ...t, category: "new", travel_trip_id: "new" })), actual);
    assert.equal(result.used, 0);
    assert.deepEqual(result.invalidLinks, ["link"]);
  }
});
test("cent arithmetic is stable", () => {
  const p = { ...plan, expected_amount: .3, allocations: [{ ...plan.allocations[0], amount: .1 }, { ...plan.allocations[0], id: randomUUID(), amount: .2 }] };
  assert.equal(summarizeFuturePlan(p, [], [], []).unallocated, 0);
});
test("a record moved into a different scope stops counting", () => {
  const moved = tx.map(item => ({ ...item, household_id: "another-group" }));
  assert.equal(summarizeFuturePlan(plan, links, moved, []).used, 0);
  assert.equal(summarizeFuturePlan(plan, links, moved, []).received, 0);
});
test("validation rejects invalid dates, duplicate IDs, negative and fractional cents", () => {
  assert(futurePlanSchema.safeParse(plan).success);
  for (const invalid of [{ ...plan, expected_amount: -1 }, { ...plan, expected_amount: 1.001 }, { ...plan, expected_date: "2026-02-30" }, { ...plan, allocations: [plan.allocations[0], plan.allocations[0]] }]) assert.equal(futurePlanSchema.safeParse(invalid).success, false);
});
test("more than 1000 actual links are loaded before calculating totals", async () => {
  const rows = Array.from({ length: 1201 }, (_, i) => ({ id: String(i).padStart(8, "0"), allocation_id: itemId, transaction_id: "t" + i }));
  let calls = 0;
  const client = { from() { let cursor = "", size = 500; return { select() { return this; }, order() { return this; }, limit(value) { size = value; return this; }, gt(key, value) { cursor = value; return this; }, then(resolve) { calls++; return Promise.resolve(resolve({ data: rows.filter(row => row.id > cursor).slice(0, size), error: null })); } }; } };
  const result = await getAllFuturePlanLinks(client);
  assert.equal(result.data.length, 1201);
  assert.equal(calls, 3);
  const transactions = rows.map(row => ({ id: row.transaction_id, type: "expense", amount: 1 }));
  assert.equal(summarizeFuturePlan(plan, result.data, transactions, []).used, 1201);
});
