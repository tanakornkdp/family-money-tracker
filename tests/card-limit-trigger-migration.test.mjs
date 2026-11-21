import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const raw = readFileSync(new URL('../supabase/migrations/20261120120000_card_limit_trigger_fixes.sql', import.meta.url), 'utf8');
const sql = raw.replace(/--[^\n]*/g, '').replace(/\s+/g, ' ').toLowerCase();
test('trigger is limited to exposure columns and has no card row write lock', () => {
  assert.match(sql, /before insert or update of card_id, amount, type, category on public\.transactions/);
  assert(!/for\s+update/i.test(raw));
  for(const column of ['card_id','amount','type','category']) assert.match(sql,new RegExp('new\\.'+column+' is distinct from old\\.'+column));
  assert.match(sql,/drop trigger if exists enforce_card_expense_limit on public\.transactions/);
});
test('advisory lock precedes visible-card read, existing-id exclusion and single-card balance', () => {
  const lock=sql.indexOf('pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.card_id::text, 0))');assert(lock>=0);
  const card=sql.indexOf('select c.* into selected_card');assert(card>lock);
  const existing=sql.indexOf('where t.id = new.id');assert(existing>lock);
  const balance=sql.indexOf('public.get_card_balance(new.card_id, excluded_id)');assert(balance>existing);
  assert(!/public\.get_card_balances\s*\(/.test(sql));
  assert.match(sql,/where c.id = p_card_id/);
});
test('both functions are invokers with empty search paths and authenticated-only grants', () => {
  assert.equal((sql.match(/security invoker set search_path = ''/g)??[]).length,2);
  for(const signature of ['public.get_card_balance(uuid, uuid)','private.enforce_card_expense_limit()']) {
    assert(sql.includes('revoke all on function '+signature+' from public, anon;'));
    assert(sql.includes('grant execute on function '+signature+' to authenticated;'));
  }
  const grants=[...sql.matchAll(/grant execute on function [^;]+ to ([^;]+);/g)];assert.equal(grants.length,2);assert(grants.every(match=>match[1]==='authenticated'));
  for(const pair of [['p1001','card_debit_insufficient'],['p1002','card_credit_insufficient'],['p1003','card_not_available']]) assert.match(sql,new RegExp("errcode = '"+pair[0]+"', message = '"+pair[1]+"'"));
});
