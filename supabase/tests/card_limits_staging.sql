-- STAGING ONLY. Human-run verification asset; not a migration and not run by npm test.
-- Run a populated copy outside this repository with psql ON_ERROR_STOP=1, as a
-- staging operator permitted to SET ROLE authenticated. Do not connect to production.
-- Every test change is inside BEGIN ... ROLLBACK. Expected failures use nested
-- exception blocks so only the expected statement rolls back, not later tests.
-- Any other error is a failure: issue ROLLBACK (or close the connection) before retrying.
-- See docs/staging-verification.md for fixture preparation, concurrency and cleanup.
--
-- Replace EVERY occurrence of these placeholders with distinct STAGING UUIDs:
-- <OWNER_USER_ID>, <MEMBER_USER_ID>, <HOUSEHOLD_ID>, <DEBIT_CARD_ID>,
-- <CREDIT_CARD_ID>, <SHARED_DEBIT_CARD_ID>, <LEGACY_CREDIT_CARD_ID>,
-- <LEGACY_TRANSACTION_ID>, <MOVE_DESTINATION_CARD_ID>.
--
-- Create first using the approved staging/app fixture workflow (not this script):
-- 1) Two real auth.users, owner and second household member; a household containing both.
-- 2) Owner's dedicated, empty debit card; empty credit card with credit_limit=100;
--    empty debit move-destination; and empty shared debit card owned by owner.
--    Member must SELECT shared card/household transactions but NOT UPDATE that card.
--    No credit_cards.household_id column is assumed: use the project's actual policies.
-- 3) Owner's dedicated legacy credit card: limit=50, exactly one expense of 100,
--    linked to <LEGACY_TRANSACTION_ID>. Create the expense while limit=100, then
--    lower the limit through the approved fixture workflow. Do not disable triggers/RLS.
-- 4) Valid expense categories named 'Other' and 'เติมเงินวอลเล็ต' if your schema
--    requires category rows. Supply any additional required baseline fields through
--    an approved fixture adaptation; never change policies just to make tests pass.
-- Operator must verify there are no hidden/unrelated transactions on these cards.
-- Fixtures persist; rows created by this script do not.

begin;
set local search_path = '';
set local row_security = on;
set local statement_timeout = '30s';
set local lock_timeout = '5s';

select pg_catalog.set_config('staging.owner_id', '<OWNER_USER_ID>', true);
select pg_catalog.set_config('staging.member_id', '<MEMBER_USER_ID>', true);
select pg_catalog.set_config('staging.household_id', '<HOUSEHOLD_ID>', true);
select pg_catalog.set_config('staging.debit_card', '<DEBIT_CARD_ID>', true);
select pg_catalog.set_config('staging.credit_card', '<CREDIT_CARD_ID>', true);
select pg_catalog.set_config('staging.shared_card', '<SHARED_DEBIT_CARD_ID>', true);
select pg_catalog.set_config('staging.legacy_card', '<LEGACY_CREDIT_CARD_ID>', true);
select pg_catalog.set_config('staging.legacy_tx', '<LEGACY_TRANSACTION_ID>', true);
select pg_catalog.set_config('staging.destination_card', '<MOVE_DESTINATION_CARD_ID>', true);
select pg_catalog.set_config('staging.credit_tx', pg_catalog.gen_random_uuid()::text, true);
select pg_catalog.set_config('staging.move_tx', pg_catalog.gen_random_uuid()::text, true);
select pg_catalog.set_config('staging.member_tx', pg_catalog.gen_random_uuid()::text, true);

set local role authenticated;
select pg_catalog.set_config('request.jwt.claims', '{"sub":"<OWNER_USER_ID>"}', true);

-- Expected: fixture checks pass under OWNER's actual RLS, not the operator's bypass role.
do $preflight$
declare
  owner_id uuid := pg_catalog.current_setting('staging.owner_id')::uuid;
  member_id uuid := pg_catalog.current_setting('staging.member_id')::uuid;
  group_id uuid := pg_catalog.current_setting('staging.household_id')::uuid;
  card_ids uuid[] := array[
    pg_catalog.current_setting('staging.debit_card')::uuid,
    pg_catalog.current_setting('staging.credit_card')::uuid,
    pg_catalog.current_setting('staging.shared_card')::uuid,
    pg_catalog.current_setting('staging.legacy_card')::uuid,
    pg_catalog.current_setting('staging.destination_card')::uuid
  ];
  c uuid;
begin
  if current_user <> 'authenticated' or auth.uid() is distinct from owner_id or owner_id = member_id then
    raise exception 'SETUP: expected distinct users and authenticated owner identity';
  end if;
  if (select pg_catalog.count(distinct value) from pg_catalog.unnest(card_ids) as ids(value)) <> 5 then
    raise exception 'SETUP: use five distinct fixture cards';
  end if;
  if (select pg_catalog.count(*) from public.credit_cards where id = any(card_ids) and user_id = owner_id) <> 5 then
    raise exception 'SETUP: owner must see all five owned fixture cards';
  end if;
  if not exists (select 1 from public.household_members where household_id = group_id and user_id = owner_id)
    or not exists (select 1 from public.household_members where household_id = group_id and user_id = member_id) then
    raise exception 'SETUP: both fixture users must belong to the household';
  end if;
  foreach c in array array[card_ids[1], card_ids[3], card_ids[5]] loop
    if not exists (select 1 from public.credit_cards where id = c and card_type = 'debit') then
      raise exception 'SETUP: expected debit fixture card';
    end if;
  end loop;
  if not exists (select 1 from public.credit_cards where id = card_ids[2] and card_type = 'credit' and credit_limit = 100)
    or not exists (select 1 from public.credit_cards where id = card_ids[4] and card_type = 'credit' and credit_limit = 50) then
    raise exception 'SETUP: credit fixtures require limits 100 and 50';
  end if;
  foreach c in array array[card_ids[1], card_ids[2], card_ids[3], card_ids[5]] loop
    if public.get_card_balance(c, null) is distinct from 0::numeric
      or exists (select 1 from public.transactions where card_id = c) then
      raise exception 'SETUP: non-legacy fixture cards must be empty';
    end if;
  end loop;
  if public.get_card_balance(card_ids[4], null) is distinct from 100::numeric
    or (select pg_catalog.count(*) from public.transactions where card_id = card_ids[4]) <> 1
    or not exists (select 1 from public.transactions where id = pg_catalog.current_setting('staging.legacy_tx')::uuid
      and card_id = card_ids[4] and user_id = owner_id and amount = 100 and type = 'expense' and payment_method = 'credit_card') then
    raise exception 'SETUP: expected one legacy credit expense of 100, limit 50';
  end if;
  raise notice 'PASS preflight: authenticated owner and fixture state';
end;
$preflight$;

-- Transaction-local setup: debit=100, move destination=10, shared debit=100;
-- credit expense=80 against limit=100, leaving available credit=20.
do $seed$
declare owner_id uuid := pg_catalog.current_setting('staging.owner_id')::uuid;
begin
  insert into public.transactions (id, user_id, household_id, title, amount, type, category, date, payment_method, card_id) values
    (pg_catalog.gen_random_uuid(), owner_id, null, 'Staging debit seed', 100, 'expense', 'เติมเงินวอลเล็ต', current_date, 'debit_card', pg_catalog.current_setting('staging.debit_card')::uuid),
    (pg_catalog.gen_random_uuid(), owner_id, null, 'Staging destination seed', 10, 'expense', 'เติมเงินวอลเล็ต', current_date, 'debit_card', pg_catalog.current_setting('staging.destination_card')::uuid),
    (pg_catalog.gen_random_uuid(), owner_id, pg_catalog.current_setting('staging.household_id')::uuid, 'Staging shared seed', 100, 'expense', 'เติมเงินวอลเล็ต', current_date, 'debit_card', pg_catalog.current_setting('staging.shared_card')::uuid),
    (pg_catalog.current_setting('staging.credit_tx')::uuid, owner_id, null, 'Staging credit near limit', 80, 'expense', 'Other', current_date, 'credit_card', pg_catalog.current_setting('staging.credit_card')::uuid);
  if public.get_card_balance(pg_catalog.current_setting('staging.debit_card')::uuid, null) is distinct from 100::numeric
    or public.get_card_balance(pg_catalog.current_setting('staging.credit_card')::uuid, null) is distinct from 80::numeric then
    raise exception 'SETUP: unexpected seeded balances';
  end if;
  raise notice 'PASS setup: test balances seeded inside rollback transaction';
end;
$seed$;

-- Scenario 1. EXPECTED: owner debit expense 101 > balance 100 is rejected with
-- P1001 / CARD_DEBIT_INSUFFICIENT; debit balance remains 100.
do $case_1$
declare rejected boolean := false;
begin
  begin
    insert into public.transactions (id, user_id, title, amount, type, category, date, payment_method, card_id)
    values (pg_catalog.gen_random_uuid(), pg_catalog.current_setting('staging.owner_id')::uuid, 'Staging debit reject', 101, 'expense', 'Other', current_date, 'debit_card', pg_catalog.current_setting('staging.debit_card')::uuid);
  exception when sqlstate 'P1001' then
    if sqlerrm <> 'CARD_DEBIT_INSUFFICIENT' then raise; end if;
    rejected := true;
  end;
  if not rejected or public.get_card_balance(pg_catalog.current_setting('staging.debit_card')::uuid, null) is distinct from 100::numeric then
    raise exception 'FAIL scenario 1: expected debit rejection without balance change';
  end if;
  raise notice 'PASS scenario 1: debit over-balance rejected';
end;
$case_1$;

-- Scenario 2. EXPECTED: credit expense 21 > available 20 is rejected with
-- P1002 / CARD_CREDIT_INSUFFICIENT; existing debt remains 80.
do $case_2$
declare rejected boolean := false;
begin
  begin
    insert into public.transactions (id, user_id, title, amount, type, category, date, payment_method, card_id)
    values (pg_catalog.gen_random_uuid(), pg_catalog.current_setting('staging.owner_id')::uuid, 'Staging credit reject', 21, 'expense', 'Other', current_date, 'credit_card', pg_catalog.current_setting('staging.credit_card')::uuid);
  exception when sqlstate 'P1002' then
    if sqlerrm <> 'CARD_CREDIT_INSUFFICIENT' then raise; end if;
    rejected := true;
  end;
  if not rejected or public.get_card_balance(pg_catalog.current_setting('staging.credit_card')::uuid, null) is distinct from 80::numeric then
    raise exception 'FAIL scenario 2: expected credit rejection without debt change';
  end if;
  raise notice 'PASS scenario 2: credit over-available rejected';
end;
$case_2$;

-- Scenario 3. EXPECTED: debit wallet top-up 25 passes; balance increases 100 -> 125.
do $case_3$
begin
  insert into public.transactions (id, user_id, title, amount, type, category, date, payment_method, card_id)
  values (pg_catalog.gen_random_uuid(), pg_catalog.current_setting('staging.owner_id')::uuid, 'Staging top-up passes', 25, 'expense', 'เติมเงินวอลเล็ต', current_date, 'debit_card', pg_catalog.current_setting('staging.debit_card')::uuid);
  if public.get_card_balance(pg_catalog.current_setting('staging.debit_card')::uuid, null) is distinct from 125::numeric then
    raise exception 'FAIL scenario 3: top-up did not add 25';
  end if;
  raise notice 'PASS scenario 3: debit top-up accepted';
end;
$case_3$;

set local role authenticated;
select pg_catalog.set_config('request.jwt.claims', '{"sub":"<MEMBER_USER_ID>"}', true);

-- Scenario 4. EXPECTED: member can SELECT shared card + its balance, but the
-- no-op name UPDATE is denied (42501 or zero RLS-visible update rows).
-- Their own household expense 30 must nevertheless pass; shared balance -> 70.
-- With column-specific card grants, separately review all editable columns too.
do $case_4$
declare affected integer := 0;
begin
  if current_user <> 'authenticated' or auth.uid() is distinct from pg_catalog.current_setting('staging.member_id')::uuid
    or not exists (select 1 from public.credit_cards where id = pg_catalog.current_setting('staging.shared_card')::uuid)
    or public.get_card_balance(pg_catalog.current_setting('staging.shared_card')::uuid, null) is distinct from 100::numeric then
    raise exception 'SETUP scenario 4: member must see the shared card and seed transaction';
  end if;
  begin
    update public.credit_cards set name = name where id = pg_catalog.current_setting('staging.shared_card')::uuid;
    get diagnostics affected = row_count;
    if affected <> 0 then raise exception 'SETUP scenario 4: member unexpectedly has card UPDATE access'; end if;
  exception when insufficient_privilege then
    null;
  end;
  insert into public.transactions (id, user_id, household_id, title, amount, type, category, date, payment_method, card_id)
  values (pg_catalog.current_setting('staging.member_tx')::uuid, pg_catalog.current_setting('staging.member_id')::uuid, pg_catalog.current_setting('staging.household_id')::uuid,
    'Staging member expense', 30, 'expense', 'Other', current_date, 'debit_card', pg_catalog.current_setting('staging.shared_card')::uuid);
  if not exists (select 1 from public.transactions where id = pg_catalog.current_setting('staging.member_tx')::uuid and user_id = auth.uid())
    or public.get_card_balance(pg_catalog.current_setting('staging.shared_card')::uuid, null) is distinct from 70::numeric then
    raise exception 'FAIL scenario 4: expected member expense and shared balance 70';
  end if;
  raise notice 'PASS scenario 4: member expense succeeds without card UPDATE access';
end;
$case_4$;

set local role authenticated;
select pg_catalog.set_config('request.jwt.claims', '{"sub":"<OWNER_USER_ID>"}', true);

-- Scenario 5. EXPECTED: same-id upsert of the existing 80 expense passes even
-- though only 20 is available if it were mistakenly counted twice. Debt stays 80.
do $case_5$
begin
  insert into public.transactions (id, user_id, household_id, title, amount, type, category, date, payment_method, card_id)
  values (pg_catalog.current_setting('staging.credit_tx')::uuid, pg_catalog.current_setting('staging.owner_id')::uuid, null,
    'Staging credit restored', 80, 'expense', 'Other', current_date, 'credit_card', pg_catalog.current_setting('staging.credit_card')::uuid)
  on conflict (id) do update set user_id = excluded.user_id, household_id = excluded.household_id,
    title = excluded.title, amount = excluded.amount, type = excluded.type, category = excluded.category,
    date = excluded.date, payment_method = excluded.payment_method, card_id = excluded.card_id;
  if (select pg_catalog.count(*) from public.transactions where id = pg_catalog.current_setting('staging.credit_tx')::uuid and title = 'Staging credit restored') <> 1
    or public.get_card_balance(pg_catalog.current_setting('staging.credit_card')::uuid, null) is distinct from 80::numeric then
    raise exception 'FAIL scenario 5: upsert changed debt or did not update exactly one row';
  end if;
  raise notice 'PASS scenario 5: near-limit same-id upsert accepted once';
end;
$case_5$;

-- Scenario 6. EXPECTED: title-only edit of legacy debt 100 vs limit 50 passes.
do $case_6$
declare affected integer;
begin
  update public.transactions set title = 'Staging legacy title edited' where id = pg_catalog.current_setting('staging.legacy_tx')::uuid;
  get diagnostics affected = row_count;
  if affected <> 1 or public.get_card_balance(pg_catalog.current_setting('staging.legacy_card')::uuid, null) is distinct from 100::numeric then
    raise exception 'FAIL scenario 6: expected one legacy title edit without debt change';
  end if;
  raise notice 'PASS scenario 6: legacy over-limit title edit accepted';
end;
$case_6$;

-- Scenario 7. EXPECTED: increasing that legacy amount 100 -> 101 is rejected
-- with P1002 / CARD_CREDIT_INSUFFICIENT; amount remains 100.
do $case_7$
declare rejected boolean := false;
begin
  begin
    update public.transactions set amount = 101 where id = pg_catalog.current_setting('staging.legacy_tx')::uuid;
  exception when sqlstate 'P1002' then
    if sqlerrm <> 'CARD_CREDIT_INSUFFICIENT' then raise; end if;
    rejected := true;
  end;
  if not rejected or not exists (select 1 from public.transactions where id = pg_catalog.current_setting('staging.legacy_tx')::uuid and amount = 100) then
    raise exception 'FAIL scenario 7: expected legacy increase rejection';
  end if;
  raise notice 'PASS scenario 7: legacy amount increase rejected';
end;
$case_7$;

-- Scenario 8. EXPECTED: moving expense 40 to a debit card holding only 10 is
-- rejected with P1001 / CARD_DEBIT_INSUFFICIENT; source/destination remain 85/10.
do $case_8$
declare rejected boolean := false;
begin
  insert into public.transactions (id, user_id, title, amount, type, category, date, payment_method, card_id)
  values (pg_catalog.current_setting('staging.move_tx')::uuid, pg_catalog.current_setting('staging.owner_id')::uuid,
    'Staging move source', 40, 'expense', 'Other', current_date, 'debit_card', pg_catalog.current_setting('staging.debit_card')::uuid);
  begin
    update public.transactions set card_id = pg_catalog.current_setting('staging.destination_card')::uuid where id = pg_catalog.current_setting('staging.move_tx')::uuid;
  exception when sqlstate 'P1001' then
    if sqlerrm <> 'CARD_DEBIT_INSUFFICIENT' then raise; end if;
    rejected := true;
  end;
  if not rejected
    or not exists (select 1 from public.transactions where id = pg_catalog.current_setting('staging.move_tx')::uuid and card_id = pg_catalog.current_setting('staging.debit_card')::uuid)
    or public.get_card_balance(pg_catalog.current_setting('staging.debit_card')::uuid, null) is distinct from 85::numeric
    or public.get_card_balance(pg_catalog.current_setting('staging.destination_card')::uuid, null) is distinct from 10::numeric then
    raise exception 'FAIL scenario 8: rejected move did not preserve source/destination';
  end if;
  raise notice 'PASS scenario 8: move to insufficient-balance card rejected';
end;
$case_8$;

-- EXPECTED: all eight scenario notices passed. All inserted rows and the legacy
-- title edit disappear; owner/member role and claim settings also revert.
rollback;
