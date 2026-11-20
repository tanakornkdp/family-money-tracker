import { test } from "node:test";
import assert from "node:assert/strict";
import { validateTransactionInput } from "../lib/validation/transactionInput.ts";
const valid = { title: " Lunch ", amount: 100, type: "expense", category: "อาหาร", date: "2026-11-20", payment_method: "cash", card_id: null };
test("valid input is trimmed without mutating the caller", () => {
  assert.equal(validateTransactionInput(valid).data.title, "Lunch");
  assert.equal(valid.title, " Lunch ");
});
test("nonfinite and out-of-range amounts and malformed dates are rejected", () => {
  for (const amount of [NaN, Infinity, -1, 0, 100000001]) assert(validateTransactionInput({ ...valid, amount }).error);
  for (const date of ["2026-02-30", "2026-13-01", "20/11/2026", "bad"]) assert(validateTransactionInput({ ...valid, date }).error);
  assert(validateTransactionInput({ ...valid, date: "2028-02-29" }).data);
});
test("unsupported fields, missing card IDs, incompatible payments and empty patches fail", () => {
  assert(validateTransactionInput({ ...valid, user_id: "other" }).error);
  assert(validateTransactionInput({ ...valid, payment_method: "credit_card" }).error);
  assert(validateTransactionInput({ ...valid, card_id: "card" }).error);
  assert(validateTransactionInput({}, true).error);
});
test("intentional Thai validation messages remain unchanged", () => {
  assert.equal(validateTransactionInput({ ...valid, travel_original_amount: -1 }).error, "ยอดเงินสกุลท้องถิ่นไม่ถูกต้อง");
  assert.equal(validateTransactionInput({ ...valid, travel_original_currency: "jpy" }).error, "สกุลเงินท้องถิ่นไม่ถูกต้อง");
  assert.equal(validateTransactionInput({ ...valid, travel_exchange_rate_to_thb: 0 }).error, "อัตราแลกเปลี่ยนไม่ถูกต้อง");
  assert.equal(validateTransactionInput({ ...valid, travel_exchange_rate_date: "2026-02-30" }).error, "วันที่อัตราแลกเปลี่ยนไม่ถูกต้อง");
});
