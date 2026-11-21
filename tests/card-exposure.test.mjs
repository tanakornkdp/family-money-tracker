import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './loadTsModule.mjs';
const { increasesCardExposure } = loadTsModule('lib/validation/cardExposure.ts');
const current = { card_id: 'card-a', amount: 1500, type: 'expense', category: 'Food' };
test('new card expenses increase exposure, while income/no-card writes do not', () => {
  assert(increasesCardExposure(null, current));
  assert(!increasesCardExposure(null, { ...current, type: 'income' }));
  assert(!increasesCardExposure(current, { ...current, card_id: null }));
  assert(!increasesCardExposure(current, { ...current, type: 'income', amount: 2000 }));
});
test('unchanged, equal-amount, metadata and amount-reducing edits do not increase exposure', () => {
  for (const patch of [{}, { amount: 1500 }, { title: 'Edited' }, { date: '2026-11-21' }, { travel_trip_id: 'trip' }, { amount: 1200 }, { category: 'Travel' }]) assert(!increasesCardExposure(current, { ...current, ...patch }));
});
test('each specified expense-increase transition is detected independently', () => {
  assert(increasesCardExposure(current, { ...current, amount: 1500.01 }));
  assert(increasesCardExposure(current, { ...current, card_id: 'card-b', amount: 1 }));
  assert(increasesCardExposure({ ...current, card_id: null }, current));
  assert(increasesCardExposure({ ...current, type: 'income' }, { ...current, amount: 1 }));
  assert(increasesCardExposure({ ...current, category: 'เติมเงินวอลเล็ต' }, { ...current, amount: 1 }));
});
test('changing to a top-up is not an increase unless another specified field increases exposure', () => {
  assert(!increasesCardExposure(current, { ...current, category: 'เติมเงินวอลเล็ต' }));
  assert(increasesCardExposure(current, { ...current, category: 'เติมเงินวอลเล็ต', amount: 2000 }));
  assert(!increasesCardExposure({ ...current, category: 'เติมเงินวอลเล็ต' }, { ...current, category: 'เติมเงินวอลเล็ต' }));
});
test('exposure comparison does not mutate either snapshot', () => {
  const before = Object.freeze({ ...current }); const after = Object.freeze({ ...current, amount: 1600 });
  assert(increasesCardExposure(before, after));assert.deepEqual(before,current);assert.equal(after.amount,1600);
});
