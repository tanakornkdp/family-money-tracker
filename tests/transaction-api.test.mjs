import { increasesCardExposure } from "../lib/validation/cardExposure.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadTsModule } from "./loadTsModule.mjs";
import { validateTransactionInput } from "../lib/validation/transactionInput.ts";
import { cardBalanceErrorResponse } from "../lib/validation/cardBalanceError.ts";
import { referenceCardBalances } from "./cardBalanceReference.ts";

const payment = { title: "Food", amount: 100, type: "expense", category: "Food", date: "2026-11-20", payment_method: "debit_card", card_id: "wallet" };
const auth = async () => ({ data: { user: { id: "user" } } });
const params = { params: Promise.resolve({ id: "topup" }) };
const helpers = { "@/lib/validation/cardExposure": { increasesCardExposure }, "@/lib/api/errors": loadTsModule("lib/api/errors.ts"), "@/lib/validation/cardBalanceError": { cardBalanceErrorResponse }, "@/lib/validation/transactionInput": { validateTransactionInput } };
test("DELETE delegates the excluded balance and ignores ordinary debit income", async () => {
  const cards = [{ id: "wallet", card_type: "debit" }];
  const rows = [{ id: "topup", card_id: "wallet", amount: 100, type: "expense", category: "เติมเงินวอลเล็ต" }, { id: "income", card_id: "wallet", amount: 999, type: "income", category: "Refund" }];
  let deleted = false, checked = false;
  const client = { auth: { getUser: auth }, from() { return { select() { return this; }, eq() { return this; }, single: async () => ({ data: rows[0], error: null }) }; } };
  const { DELETE } = loadTsModule("app/api/transactions/[id]/route.ts", { ...helpers, "@/lib/supabase/server": { createClient: async () => client }, "@/services/creditCards": { getCardBalances: async (_client, requested, excluded) => { checked = true; assert.deepEqual(requested, [{ id: "wallet" }]); assert.equal(excluded, "topup"); return referenceCardBalances(cards, rows, excluded); } }, "@/services/transactions": { deleteTransaction: async () => { deleted = true; } } });
  const response = await DELETE({}, params);
  assert.equal(response.status, 200); assert(checked); assert(deleted);
});
test("DELETE preserves the original negative-wallet validation message", async () => {
  const client = { auth: { getUser: auth }, from() { return { select() { return this; }, eq() { return this; }, single: async () => ({ data: { card_id: "wallet", category: "เติมเงินวอลเล็ต" }, error: null }) }; } };
  const { DELETE } = loadTsModule("app/api/transactions/[id]/route.ts", { ...helpers, "@/lib/supabase/server": { createClient: async () => client }, "@/services/creditCards": { getCardBalances: async () => ({ wallet: -40 }) }, "@/services/transactions": { deleteTransaction: async () => assert.fail("must not delete") } });
  const response = await DELETE({}, params);
  assert.equal(response.status, 400);
  assert.equal((await response.json()).error, "ไม่สามารถลบได้ เพราะยอดวอลเล็ตจะติดลบ (คงเหลือหลังลบ: -40 บาท)");
});
test("POST maps a database race failure after the fast precheck passed", async () => {
  const { POST } = loadTsModule("app/api/transactions/route.ts", { ...helpers, "@/lib/supabase/server": { createClient: async () => ({ auth: { getUser: auth } }) }, "@/services/travelTrips": { getActiveTravelTrips: async () => [] }, "@/services/travelFx": {}, "@/services/userSettings": {}, "@/services/creditCards": { getCardsWithBalance: async () => [{ id: "wallet", card_type: "debit", balance: 200, available: 200 }] }, "@/services/transactions": { createTransaction: async () => { throw new Error("wrapped", { cause: { code: "P1001", message: "CARD_DEBIT_INSUFFICIENT", details: '{"available":20}' } }); } } });
  const response = await POST({ json: async () => payment, nextUrl: new URL("https://example.test/api/transactions?source=import") });
  assert.equal(response.status, 400);
  assert.equal((await response.json()).error, "ยอดเงินในบัตรไม่เพียงพอ (คงเหลือ 20 บาท)");
});
test("PATCH maps trigger errors and unknown internal exceptions are not leaked", async () => {
  for (const error of [new Error("wrapped", { cause: { code: "P1002", message: "CARD_CREDIT_INSUFFICIENT", details: '{"available":20}' } }), new Error("internal schema details / private hostname")]) {
    const client = { auth: { getUser: auth }, from() { return { select() { return this; }, eq() { return this; }, single: async () => ({ data: payment, error: null }) }; } };
    const { PATCH } = loadTsModule("app/api/transactions/[id]/route.ts", { ...helpers, "@/lib/supabase/server": { createClient: async () => client }, "@/services/creditCards": { getCardsWithBalance: async () => [{ id: "wallet", balance: 200, available: 200 }] }, "@/services/transactions": { updateTransaction: async () => { throw error; } } });
    const response = await PATCH({ json: async () => ({ amount: 101 }) }, params);
    assert.equal(response.status, error.cause ? 400 : 500);
    assert.equal((await response.json()).error, error.cause ? "วงเงินบัตรเครดิตไม่เพียงพอ" : "Internal server error");
  }
});
