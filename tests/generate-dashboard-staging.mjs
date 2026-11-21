import {writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {A,B,C,H,K,BILL,TRIP,fixtureRows,readGoldens} from './dashboardTotalsFixtures.mjs';
// Deterministic source-only generator; never opens a database or updates goldens.
export function renderDashboardStagingSql(){
 const bindings=new Map([[A,'<OWNER_USER_ID>'],[B,'<MEMBER_USER_ID>'],[C,'<OUTSIDER_USER_ID>'],[H,'<HOUSEHOLD_ID>'],[K,'<OTHER_HOUSEHOLD_ID>'],[BILL,'<RECURRING_BILL_ID>'],[TRIP,'<TRAVEL_TRIP_ID>']]);
 const replace=value=>{let text=JSON.stringify(value,null,2);for(const [id,placeholder] of bindings)text=text.replaceAll(id,placeholder);return text;};
 const seeds=fixtureRows().filter(t=>!t.id.startsWith('bbbbbbbb')).map(t=>({...t,title_id:null,card_id:t.payment_method==='credit_card'?'<CREDIT_CARD_ID>':null}));
 return `-- GENERATED from tests/dashboardTotalsFixtures.mjs and frozen TS goldens.
-- Regenerate only this SQL: node tests/generate-dashboard-staging.mjs
-- STAGING ONLY; human-run, NOT executed by npm test or any migration.
-- psql -v ON_ERROR_STOP=1 -f <filled-copy-outside-repo.sql>
-- Uses BEGIN/ROLLBACK; on ANY failure ROLLBACK/close, do not continue.
-- Precreate via approved staging workflow, then replace ALL placeholders:
-- Three dedicated Auth users OWNER/MEMBER/OUTSIDER with NO transaction history;
-- HOUSEHOLD contains OWNER and MEMBER; OTHER_HOUSEHOLD contains OUTSIDER ONLY.
-- OWNER cannot see MEMBER personal rows or OTHER_HOUSEHOLD transactions.
-- OWNER owns RECURRING_BILL and TRAVEL_TRIP; provide CREDIT_CARD visible to OWNER
-- with at least 100 available, and approved categories if baseline FKs require them.
-- Copy baseline schema/RLS first; apply through 20261120130000 before testing.
-- Check extra baseline required columns/constraints against fixtures first.
-- In particular one legacy payment_method NULL is intentional (TS ?? cash).
-- If the actual baseline disallows that row, stop and document this case as
-- inapplicable pending a reviewed fixture adaptation; do not weaken constraints.
-- Fixed fixture transaction IDs must be unused. All inserts/temps roll back.
-- Test amount is canonical amount, NOT travel_amount_thb (intentionally 999).

begin;
set local search_path = '';
set local row_security = on;
set local statement_timeout = '60s';
set local lock_timeout = '5s';

-- Operator creates exact fixtures; assertions below run as authenticated OWNER.
-- No Auth users, membership, policy or schema modifications are performed here.
create temporary table dashboard_fixtures on commit drop as
  select * from public.transactions with no data;
insert into pg_temp.dashboard_fixtures
select * from pg_catalog.jsonb_populate_recordset(null::public.transactions,
$seeds$
${replace(seeds)}
$seeds$::jsonb);
insert into pg_temp.dashboard_fixtures
select (pg_catalog.jsonb_populate_record(null::public.transactions,
  pg_catalog.to_jsonb(t) || pg_catalog.jsonb_build_object(
    'id', 'bbbbbbbb-bbbb-4bbb-8bbb-' || pg_catalog.lpad(n::text,12,'0'),
    'date','2026-10-15','amount',0.01,'type','expense','category','Micro'
  ))).*
from pg_temp.dashboard_fixtures as t cross join pg_catalog.generate_series(1,1005) as n
where t.id = 'aaaaaaaa-aaaa-4aaa-8aaa-000000000001'::uuid;

-- Refuse contaminated accounts, including invisible rows checked by operator.
do $preflight$
begin
  if exists(select 1 from public.transactions where user_id in
    ('<OWNER_USER_ID>'::uuid,'<MEMBER_USER_ID>'::uuid,'<OUTSIDER_USER_ID>'::uuid)) then
    raise exception 'Dedicated fixture accounts must have no transaction history';
  end if;
end;
$preflight$;
insert into public.transactions select * from pg_temp.dashboard_fixtures;

create temporary table dashboard_expected (name text, options jsonb, expected jsonb) on commit drop;
insert into pg_temp.dashboard_expected
select name,options,expected from pg_catalog.jsonb_to_recordset(
$goldens$
${replace(readGoldens())}
$goldens$::jsonb) as x(name text,options jsonb,expected jsonb);
grant select on pg_temp.dashboard_expected to authenticated;

set local role authenticated;
select pg_catalog.set_config('request.jwt.claims','{"sub":"<OWNER_USER_ID>"}',true);

-- Expected: all twelve complete JSON comparisons match fixed TS reference numbers.
-- Includes >1000 visible rows, inclusive date edges, reversed/empty/one-sided
-- bounds, household precedence, member/all/personal scopes and exact category
-- first-seen/float tie ranking. No range filter ever narrows all-time cash.
do $assertions$
declare
  c record;
  r record;
  actual jsonb;
  users uuid[];
begin
  if pg_catalog.has_function_privilege('anon', 'public.get_dashboard_totals(uuid,boolean,uuid[],date,date,boolean)', 'execute') then
    raise exception 'anon must not execute dashboard totals';
  end if;
  for c in select * from pg_temp.dashboard_expected order by name loop
    select pg_catalog.array_agg(value::uuid) into users
      from pg_catalog.jsonb_array_elements_text(coalesce(c.options->'userIds','[]'::jsonb));
    select * into strict r from public.get_dashboard_totals(
      (c.options->>'householdId')::uuid,
      coalesce((c.options->>'personalOnly')::boolean,false), users,
      (c.options->>'dateFrom')::date,(c.options->>'dateTo')::date,true
    );
    actual := pg_catalog.jsonb_build_object(
      'cashBalance',r.cash_balance,'rangeCashBalance',r.range_cash_balance,
      'personalCashBalance',r.personal_cash_balance,
      'kpis',pg_catalog.jsonb_build_object('totalIncome',r.total_income,
        'totalExpense',r.total_expense,'balance',r.balance,'transactionCount',r.transaction_count),
      'incomeCount',r.income_count,'expenseCount',r.expense_count,
      'accountCashBalance',r.account_cash_balance,'bankBalance',r.bank_balance,
      'topCategories',r.top_categories);
    if actual is distinct from c.expected then
      raise exception 'Dashboard golden mismatch: % (inspect synthetic results locally)', c.name;
    end if;
    raise notice 'PASS dashboard golden: %', c.name;
  end loop;
  select * into strict r from public.get_dashboard_totals();
  if r.top_categories is distinct from '[]'::jsonb then
    raise exception 'Disabled category aggregation must return []';
  end if;
  raise notice 'PASS optional categories disabled';
end;
$assertions$;

reset role;
rollback;
-- Expected: 12 PASS golden notices plus disabled-category PASS; no retained rows.
-- RLS/auth/base schema and actual numeric/enum types must be verified here.
-- SQL/concurrency is NOT proven by offline TS tests; record result in staging guide.
`;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){writeFileSync(new URL('../supabase/tests/dashboard_totals_staging.sql',import.meta.url),renderDashboardStagingSql());console.log('Wrote rollback-only dashboard SQL fixture asset; not executed.');}
