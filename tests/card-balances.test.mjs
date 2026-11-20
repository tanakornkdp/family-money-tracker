import { test } from "node:test";
import assert from "node:assert/strict";
import { referenceCardBalances } from "./cardBalanceReference.ts";
import { cardBalanceErrorResponse } from "../lib/validation/cardBalanceError.ts";

const cards = [{ id: "wallet", card_type: "debit" }, { id: "credit", card_type: "credit" }, { id: "empty", card_type: "debit" }];
const tx = (id, card_id, amount, type, category = "Food") => ({ id, card_id, amount, type, category });
test("debit top-up takes precedence over type; non-top-up debit income is ignored", () => {
  const result = referenceCardBalances(cards, [tx("a", "wallet", "1000", "income", "เติมเงินวอลเล็ต"), tx("b", "wallet", 500, "expense", "เติมเงินวอลเล็ต"), tx("c", "wallet", 200, "expense"), tx("d", "wallet", 777, "income"), tx("e", null, 1e6, "income")]);
  assert.deepEqual(result, { wallet: 1300, credit: 0, empty: 0 });
});
test("credit debt adds expenses and subtracts income, including overpayment", () => {
  const rows = [tx("a", "credit", 600, "expense"), tx("b", "credit", 150, "income"), tx("c", "credit", 20, "expense", "เติมเงินวอลเล็ต")];
  assert.equal(referenceCardBalances(cards, rows).credit, 470);
  assert.equal(referenceCardBalances(cards, [...rows, tx("d", "credit", 1000, "income")]).credit, -530);
});
test("excluding an edited/deleted row neither double-counts nor subtracts debit income", () => {
  const rows = [tx("topup", "wallet", 100, "expense", "เติมเงินวอลเล็ต"), tx("charge", "wallet", 40, "expense"), tx("income", "wallet", 2000, "income")];
  assert.equal(referenceCardBalances(cards, rows, "charge").wallet, 100);
  assert.equal(referenceCardBalances(cards, rows, "topup").wallet, -40);
  assert.equal(referenceCardBalances(cards, rows, "income").wallet, 60);
});
test("the reference sees charges beyond the old 1000-row cap", () => {
  const rows = Array.from({ length: 1501 }, (_, i) => tx(String(i), "credit", 1, "expense"));
  assert.equal(referenceCardBalances(cards, rows).credit, 1501);
  assert.equal(referenceCardBalances(cards, rows.slice(0, 1000)).credit, 1000);
});
test("trigger failures translate to the existing POST/PATCH copy through an Error cause", () => {
  for (const [code, message, post, patch] of [
    ["P1001", "CARD_DEBIT_INSUFFICIENT", "ยอดเงินในบัตรไม่เพียงพอ (คงเหลือ 25 บาท)", "ยอดเงินในบัตรเดบิตไม่เพียงพอ"],
    ["P1002", "CARD_CREDIT_INSUFFICIENT", "วงเงินบัตรไม่เพียงพอ (คงเหลือ 25 บาท)", "วงเงินบัตรเครดิตไม่เพียงพอ"],
  ]) {
    const error = new Error("internal error", { cause: { code, message, details: JSON.stringify({ available: 25 }) } });
    assert.deepEqual(cardBalanceErrorResponse(error, "POST"), { error: post, status: 400 });
    assert.deepEqual(cardBalanceErrorResponse(error, "PATCH"), { error: patch, status: 400 });
  }
});
test("unknown/malformed internal details never enter public error messages", () => {
  assert.equal(cardBalanceErrorResponse({ code: "23505", message: "private SQL details" }, "POST"), null);
  assert.equal(cardBalanceErrorResponse({ code: "P1001", message: "wrong prefix" }, "POST"), null);
  for (const details of ["private-token", '{"available":"secret"}', '{"available":null}']) assert.equal(cardBalanceErrorResponse({ code: "P1001", message: "CARD_DEBIT_INSUFFICIENT", details }, "POST").error, "ยอดเงินในบัตรเดบิตไม่เพียงพอ");
});
