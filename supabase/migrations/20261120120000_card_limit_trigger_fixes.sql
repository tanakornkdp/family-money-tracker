-- One-card counterpart of the existing aggregate RPC: invoker/RLS semantics and
-- debit top-up precedence are identical. The existing multi-card RPC is unchanged.
create or replace function public.get_card_balance(p_card_id uuid, p_excluded_transaction_id uuid default null)
returns numeric
language sql stable security invoker set search_path = ''
as $$
  select coalesce(pg_catalog.sum(case
    when c.card_type = 'debit' then case
      when t.category = 'เติมเงินวอลเล็ต' then t.amount
      when t.type = 'expense' then -t.amount
      else 0 end
    when t.type = 'expense' then t.amount
    when t.type = 'income' then -t.amount
    else 0 end), 0)::numeric
  from public.credit_cards as c
  left join public.transactions as t on t.card_id = c.id
    and (p_excluded_transaction_id is null or t.id <> p_excluded_transaction_id)
  where c.id = p_card_id
  group by c.id;
$$;
revoke all on function public.get_card_balance(uuid, uuid) from public, anon;
grant execute on function public.get_card_balance(uuid, uuid) to authenticated;

-- Only new expense exposure is enforced: card move, conversion to expense,
-- removal of the wallet top-up category, or increased amount. Unchanged and
-- exposure-reducing legacy edits remain possible even on an over-limit card.
-- The per-card transaction advisory lock requires no card UPDATE permission;
-- the plain card read and aggregate still obey caller SELECT RLS. VOLATILE
-- ensures a fresh query snapshot after waiting at READ COMMITTED.
-- A same-ID INSERT excludes the existing visible row, including upsert restores.
create or replace function private.enforce_card_expense_limit()
returns trigger language plpgsql volatile security invoker set search_path = ''
as $$
declare
  selected_card public.credit_cards%rowtype;
  current_balance numeric;
  available numeric;
  excluded_id uuid;
begin
  if new.card_id is null or new.type is distinct from 'expense' then return new; end if;
  if tg_op = 'UPDATE' then
    if not (new.card_id is distinct from old.card_id
      or new.amount is distinct from old.amount
      or new.type is distinct from old.type
      or new.category is distinct from old.category) then return new; end if;
    if not (new.card_id is distinct from old.card_id
      or old.type is distinct from 'expense'
      or (old.category is not distinct from 'เติมเงินวอลเล็ต' and new.category is distinct from 'เติมเงินวอลเล็ต')
      or (new.amount > old.amount) is true) then return new; end if;
    excluded_id := old.id;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.card_id::text, 0));
  select c.* into selected_card from public.credit_cards as c where c.id = new.card_id;
  if not found then
    raise exception using errcode = 'P1003', message = 'CARD_NOT_AVAILABLE';
  end if;
  if selected_card.card_type = 'debit' and new.category = 'เติมเงินวอลเล็ต' then return new; end if;
  if tg_op = 'INSERT' then
    if exists (select 1 from public.transactions as t where t.id = new.id) then
      excluded_id := new.id;
    end if;
  end if;

  select public.get_card_balance(new.card_id, excluded_id) into current_balance;
  current_balance := coalesce(current_balance, 0);
  if selected_card.card_type = 'debit' then
    available := current_balance;
    if new.amount > available then
      raise exception using errcode = 'P1001', message = 'CARD_DEBIT_INSUFFICIENT',
        detail = pg_catalog.json_build_object('available', available)::text;
    end if;
  else
    available := selected_card.credit_limit - current_balance;
    if new.amount > available then
      raise exception using errcode = 'P1002', message = 'CARD_CREDIT_INSUFFICIENT',
        detail = pg_catalog.json_build_object('available', available)::text;
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.enforce_card_expense_limit() from public, anon;
grant execute on function private.enforce_card_expense_limit() to authenticated;

drop trigger if exists enforce_card_expense_limit on public.transactions;
create trigger enforce_card_expense_limit
  before insert or update of card_id, amount, type, category on public.transactions
  for each row execute function private.enforce_card_expense_limit();
