-- Read-only aggregates: preserve getTransactions scope precedence and inclusive dates.
-- RLS remains the visibility boundary; no caller-supplied identity bypasses it.
create or replace function public.get_dashboard_totals(
  p_household_id uuid default null,
  p_personal_only boolean default false,
  p_user_ids uuid[] default null,
  p_date_from date default null,
  p_date_to date default null,
  p_include_categories boolean default false
)
returns table (
  cash_balance numeric, range_cash_balance numeric, personal_cash_balance numeric,
  total_income numeric, total_expense numeric, balance numeric,
  transaction_count bigint, income_count bigint, expense_count bigint,
  top_categories jsonb, account_cash_balance numeric, bank_balance numeric
)
language sql stable security invoker set search_path = ''
as $function$
  with scoped as materialized (
    select t.id, t.user_id, t.household_id, t.amount, t.type, t.category, t.date, t.created_at,
      case
        when coalesce(t.payment_method, 'cash') <> 'cash' then 0::numeric
        when t.category = 'เติมเงินวอลเล็ต' then -t.amount
        when t.type = 'income' then t.amount
        when t.type = 'expense' then -t.amount
        else 0::numeric
      end as cash_delta,
      (p_date_from is null or t.date >= p_date_from)
        and (p_date_to is null or t.date <= p_date_to) as in_range
    from public.transactions as t
    where (case when p_household_id is not null then t.household_id = p_household_id
      when coalesce(p_personal_only, false) then t.household_id is null else true end)
      and (coalesce(pg_catalog.cardinality(p_user_ids), 0) = 0 or t.user_id = any(p_user_ids))
  ), totals as (
    select
      pg_catalog.round(coalesce(pg_catalog.sum(s.cash_delta), 0)::numeric, 2) as cash,
      pg_catalog.round(coalesce(pg_catalog.sum(s.cash_delta) filter (where s.in_range), 0)::numeric, 2) as range_cash,
      pg_catalog.round(coalesce(pg_catalog.sum(s.cash_delta) filter (where s.user_id = (select auth.uid()) and s.household_id is null), 0)::numeric, 2) as personal_cash,
      pg_catalog.round(coalesce(pg_catalog.sum(case when s.type = 'income' then s.amount else -s.amount end) filter (where s.user_id = (select auth.uid()) and coalesce(s.payment_method, 'cash') = 'cash'), 0)::numeric, 2) as account_cash,
      pg_catalog.round(coalesce(pg_catalog.sum(case when s.type = 'income' then s.amount else -s.amount end) filter (where s.user_id = (select auth.uid()) and s.payment_method = 'bank_transfer'), 0)::numeric, 2) as bank,
      coalesce(pg_catalog.sum(s.amount) filter (where s.in_range and s.category is distinct from 'เติมเงินวอลเล็ต' and s.type = 'income'), 0)::numeric as income,
      coalesce(pg_catalog.sum(s.amount) filter (where s.in_range and s.category is distinct from 'เติมเงินวอลเล็ต' and s.type = 'expense'), 0)::numeric as expense,
      pg_catalog.count(*) filter (where s.in_range and s.category is distinct from 'เติมเงินวอลเล็ต') as n,
      pg_catalog.count(*) filter (where s.in_range and s.category is distinct from 'เติมเงินวอลเล็ต' and s.type = 'income') as ni,
      pg_catalog.count(*) filter (where s.in_range and s.category is distinct from 'เติมเงินวอลเล็ต' and s.type = 'expense') as ne
    from scoped as s
  ), ordered_expenses as (
    select s.*, pg_catalog.row_number() over (order by s.date desc, s.created_at desc, s.id desc) as ordinal
    from scoped as s where p_include_categories and s.type = 'expense'
  ), category_sums as (
    -- Mobile's legacy Map sums use JS numbers in transaction order; preserve
    -- ordered float8 addition and first-seen ties rather than changing ranking.
    -- Unlike KPIs, this category card intentionally includes wallet top-ups.
    select e.category,
      pg_catalog.sum(e.amount::double precision order by e.ordinal) as amount,
      pg_catalog.min(e.ordinal) as first_seen
    from ordered_expenses as e group by e.category
  ), top_four as (
    select c.* from category_sums as c order by c.amount desc, c.first_seen limit 4
  )
  select t.cash, t.range_cash, t.personal_cash,
    pg_catalog.round(t.income, 2), pg_catalog.round(t.expense, 2), pg_catalog.round(t.income - t.expense, 2),
    t.n, t.ni, t.ne,
    coalesce((select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('category', c.category, 'amount', c.amount) order by c.amount desc, c.first_seen) from top_four as c), '[]'::jsonb), t.account_cash, t.bank
  from totals as t;
$function$;
revoke all on function public.get_dashboard_totals(uuid, boolean, uuid[], date, date, boolean) from public, anon;
grant execute on function public.get_dashboard_totals(uuid, boolean, uuid[], date, date, boolean) to authenticated;
