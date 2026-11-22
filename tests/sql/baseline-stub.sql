-- TEST STUB ONLY, NOT THE REAL BASELINE SCHEMA. Production RLS is NOT modelled.
-- Derived only from types/database.ts and references in supabase/migrations/*.sql.
-- Replace with the real baseline after exporting: supabase db dump --schema public
-- Also supply actual private helpers/Auth dependencies through approved fixtures.
-- Do not deploy this file. Nullable limits/payment methods intentionally support
-- legacy edge fixtures; these are not claims about deployed constraints/policies.
create schema auth;
create schema private;
create role anon nologin;
create role authenticated nologin;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable security invoker set search_path = '' as $$
  select nullif(pg_catalog.current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
create table public.households(id uuid primary key, name text, owner_id uuid, created_at timestamptz default now());
create table public.household_members(id uuid primary key, household_id uuid, user_id uuid, role text, joined_at timestamptz default now());
create function private.is_household_member(household uuid, member uuid) returns boolean
language sql stable security invoker set search_path = '' as $$
  select exists(select 1 from public.household_members m where m.household_id=household and m.user_id=member);
$$;
create table public.credit_cards(
  id uuid primary key default gen_random_uuid(), user_id uuid, name text,
  card_type text, credit_limit numeric, billing_date integer, due_date integer,
  color text, created_at timestamptz default now()
);
create table public.transactions(
  id uuid primary key default gen_random_uuid(), user_id uuid, household_id uuid,
  title text, title_id uuid, amount numeric, type text, category text, date date,
  created_at timestamptz default now(), payment_method text, card_id uuid,
  recurring_occurrence_date date, travel_trip_id uuid, recurring_bill_id uuid,
  travel_amount_thb numeric, travel_original_amount numeric,
  travel_original_currency text, travel_exchange_rate_to_thb numeric,
  travel_exchange_rate_date date
);
create table public.categories(id uuid primary key default gen_random_uuid(), user_id uuid, name text, type text, icon text, created_at timestamptz default now(), unique(user_id,name));
create table public.financial_goals(id uuid primary key, user_id uuid, household_id uuid, name text, goal_type text, target_amount numeric, current_amount numeric, target_date date, status text, created_at timestamptz default now(), updated_at timestamptz default now());
create table public.goal_contributions(id uuid primary key, goal_id uuid, user_id uuid, amount numeric, note text, created_at timestamptz default now());
create table public.travel_trips(id uuid primary key, user_id uuid, name text, destination text, currency text, start_date date, end_date date, time_zone text, activation_mode text, is_active boolean, exchange_rate_to_thb numeric, created_at timestamptz default now(), updated_at timestamptz default now());
create table public.receipts(id uuid primary key, user_id uuid, file_path text, ocr_text text, parsed_amount numeric, parsed_merchant text, parsed_date date, status text, transaction_id uuid, created_at timestamptz default now());
grant usage on schema public, auth, private to anon, authenticated;
grant execute on function auth.uid(), private.is_household_member(uuid,uuid) to authenticated;
-- Baseline table grants permit role tests; no production SELECT/UPDATE policy is implied.
grant select, insert, update, delete on public.credit_cards, public.transactions to authenticated;

create table public.transaction_titles(id uuid primary key default gen_random_uuid(), user_id uuid, name text, type text, category text, goal_id uuid, icon text, created_at timestamptz default now(), unique(user_id,name));
