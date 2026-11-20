-- RLS-visible debit balance: top-ups add regardless of type, other expenses
-- subtract, other income is ignored. Credit debt: expenses add, income subtracts.
create or replace function public.get_card_balances(excluded_transaction_id uuid default null)
returns table(card_id uuid, balance numeric)
language sql stable security invoker set search_path = ''
as $$
  select c.id, coalesce(pg_catalog.sum(case
    when c.card_type = 'debit' then case
      when t.category = 'เติมเงินวอลเล็ต' then t.amount
      when t.type = 'expense' then -t.amount
      else 0 end
    when t.type = 'expense' then t.amount
    when t.type = 'income' then -t.amount
    else 0 end), 0)::numeric
  from public.credit_cards as c
  left join public.transactions as t on t.card_id = c.id
    and (excluded_transaction_id is null or t.id <> excluded_transaction_id)
  group by c.id
  order by c.id;
$$;
revoke all on function public.get_card_balances(uuid) from public, anon;
grant execute on function public.get_card_balances(uuid) to authenticated;

-- VOLATILE is intentional: after waiting on the card-row lock, the next query
-- must see committed writes at READ COMMITTED. No definer/RLS bypass is used.
-- An expense may consume at most debit balance, or credit_limit minus debt.
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
  select c.* into selected_card from public.credit_cards as c
    where c.id = new.card_id for update;
  if not found then
    raise exception using errcode = 'P1003', message = 'CARD_NOT_AVAILABLE';
  end if;
  if selected_card.card_type = 'debit' and new.category = 'เติมเงินวอลเล็ต' then return new; end if;
  if tg_op = 'UPDATE' then excluded_id := old.id; end if;
  select b.balance into current_balance from public.get_card_balances(excluded_id) as b
    where b.card_id = selected_card.id;
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
create trigger enforce_card_expense_limit before insert or update on public.transactions
  for each row execute function private.enforce_card_expense_limit();
