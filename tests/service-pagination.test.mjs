import { test } from "node:test";
import assert from "node:assert/strict";
import { loadTsModule } from "./loadTsModule.mjs";
import { referenceCardBalances } from "./cardBalanceReference.ts";

const { getTransactions } = loadTsModule("services/transactions.ts", { "@/lib/utils/dateHelpers": {} });
const { getCardBalances } = loadTsModule("services/creditCards.ts");

function transactionClient(rows) {
  const calls = [];
  return { calls, from(table) {
    assert.equal(table, "transactions");
    const filters = [], orders = [];
    return {
      select() { return this; },
      order(key, options) { orders.push([key, options]); return this; },
      eq(key, value) { filters.push(row => row[key] === value); return this; },
      is(key, value) { filters.push(row => row[key] === value); return this; },
      in(key, values) { filters.push(row => values.includes(row[key])); return this; },
      gte(key, value) { filters.push(row => row[key] >= value); return this; },
      lte(key, value) { filters.push(row => row[key] <= value); return this; },
      async range(from, to) { calls.push({ from, to, orders }); return { data: rows.filter(row => filters.every(filter => filter(row))).slice(from, to + 1), error: null }; },
    };
  } };
}
test("getTransactions paginates with fresh filters and all three stable ordering keys", async () => {
  const rows = Array.from({ length: 2501 }, (_, id) => ({ id, date: "2026-11-20", created_at: "2026-11-20T00:00:00Z", user_id: "member", household_id: "group" }));
  const client = transactionClient([...rows, { id: "exclude", date: "2026-01-01", user_id: "other", household_id: null }]);
  const data = await getTransactions(client, { householdId: "group", userIds: ["member"], dateFrom: "2026-11-01", dateTo: "2026-11-30" });
  assert.equal(data.length, 2501);
  assert.equal(client.calls.length, 3);
  for (const call of client.calls) assert.deepEqual(call.orders, [["date", { ascending: false }], ["created_at", { ascending: false }], ["id", { ascending: false }]]);
});
test("explicit limits and personal scope still apply", async () => {
  const rows = Array.from({ length: 1400 }, (_, id) => ({ id, household_id: null }));
  const client = transactionClient([...rows, { id: "shared", household_id: "group" }]);
  assert.equal((await getTransactions(client, { personalOnly: true, limit: 1200 })).length, 1200);
  assert.equal(client.calls.length, 2);
  assert.equal((await getTransactions(transactionClient(rows), { limit: 20 })).length, 20);
});
test("balances use only the aggregate RPC, preserving requested IDs and exclusion", async () => {
  const calls = [];
  const client = { rpc(name, args) { calls.push({ name, args }); return { in(key, ids) { assert.equal(key, "card_id"); assert.deepEqual(ids, ["wallet", "credit"]); return this; }, order(key) { assert.equal(key, "card_id"); return this; }, range() { return Promise.resolve({ data: [{ card_id: "wallet", balance: "15.25" }, { card_id: "credit", balance: 100 }], error: null }); } }; } };
  assert.deepEqual(await getCardBalances(client, [{ id: "wallet" }, { id: "credit" }], "excluded"), { wallet: 15.25, credit: 100 });
  assert.deepEqual(calls, [{ name: "get_card_balances", args: { excluded_transaction_id: "excluded" } }]);
  assert.deepEqual(await getCardBalances({}, []), {});
});
test("a missing aggregate cannot silently turn an unavailable card into zero funds", async () => {
  const client = { rpc() { return { in() { return this; }, order() { return this; }, range: async () => ({ data: [], error: null }) }; } };
  await assert.rejects(getCardBalances(client, [{ id: "missing" }]), /unavailable/);
});
test("mocked RPC result matches the test-only reference for more than 1000 transactions", async () => {
  const cards = [{ id: "credit", card_type: "credit" }];
  const rows = Array.from({ length: 1501 }, (_, i) => ({ id: String(i), card_id: "credit", type: "expense", amount: 1, category: "Food" }));
  const expected = referenceCardBalances(cards, rows);
  const client = { rpc() { return { in() { return this; }, order() { return this; }, range: async () => ({ data: [{ card_id: "credit", balance: expected.credit }], error: null }) }; } };
  assert.equal((await getCardBalances(client, cards)).credit, 1501);
});
test("backup includes all transaction rows rather than a silent first page", async () => {
  const records = Array.from({ length: 2501 }, (_, id) => ({ id, user_id: "user", amount: 1 }));
  const client = { from(table) { return { select() { return this; }, eq() { return this; }, order() { return this; }, async range(from, to) { return { data: table === "transactions" ? records.slice(from, to + 1) : [], error: null }; } }; } };
  const { GET } = loadTsModule("app/api/backup/route.ts", { "@/lib/auth/getUser": { getUser: async () => ({ id: "user" }) }, "@/lib/supabase/server": { createClient: async () => client } });
  const response = await GET();
  assert.equal(response.status, 200);
  const backup = await response.json();
  assert.equal(backup.data.transactions.length, 2501);
});
