import { test } from "node:test";
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { referenceCardBalances } from "./cardBalanceReference.ts";

test("aggregate response removes per-transaction transfer and JSON parsing work", () => {
  const cards = Array.from({ length: 20 }, (_, i) => ({ id: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`, card_type: "credit" }));
  const transactions = Array.from({ length: 1000 }, (_, i) => ({ id: String(i), card_id: cards[i % cards.length].id, amount: 100, type: "expense", category: "อาหาร" }));
  const before = JSON.stringify(transactions.map(({ card_id, amount, type, category }) => ({ card_id, amount, type, category })));
  const balances = referenceCardBalances(cards, transactions);
  const after = JSON.stringify(cards.map(card => ({ card_id: card.id, balance: balances[card.id] })));
  const beforeBytes = Buffer.byteLength(before), afterBytes = Buffer.byteLength(after);
  const measure = source => { const start = performance.now(); for (let i = 0; i < 1000; i++) JSON.parse(source); return performance.now() - start; };
  const beforeMs = measure(before), afterMs = measure(after);
  assert(afterBytes < beforeBytes / 20);
  console.log(JSON.stringify({ benchmark: "synthetic JSON transport, not database latency", transactions: 1000, cards: 20, beforeBytes, afterBytes, reductionPercent: Number((100 * (1 - afterBytes / beforeBytes)).toFixed(2)), parseIterations: 1000, beforeParseMs: Number(beforeMs.toFixed(2)), afterParseMs: Number(afterMs.toFixed(2)) }));
});
