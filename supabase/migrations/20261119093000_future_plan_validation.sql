create or replace function private.validate_future_money_plan() returns trigger language plpgsql security invoker set search_path = '' as $$
declare item jsonb; ref uuid; kind text;
begin
  if tg_op = 'UPDATE' then
    if new.user_id <> old.user_id or new.household_id is distinct from old.household_id then raise exception 'Plan ownership and scope cannot change'; end if;
    if exists(select 1 from public.future_money_plan_links l where l.plan_id = old.id and l.allocation_id is not null and not exists(select 1 from jsonb_array_elements(new.allocations) a where (a->>'id')::uuid = l.allocation_id)) then raise exception 'Unlink actual records before removing an allocation'; end if;
    if exists(select 1 from public.future_money_plan_links l join lateral jsonb_array_elements(old.allocations) a on (a->>'id')::uuid=l.allocation_id join lateral jsonb_array_elements(new.allocations) b on b->>'id'=a->>'id' where l.plan_id=old.id and (a->>'kind' is distinct from b->>'kind' or a->>'target' is distinct from b->>'target')) then raise exception 'Unlink actual records before changing a destination'; end if;
    new.revision := old.revision + 1;
  else new.revision := 1;
  end if;
  new.updated_at := now();
  if (select count(*) <> count(distinct a->>'id') from jsonb_array_elements(new.allocations) a) then raise exception 'Duplicate allocation'; end if;
  for item in select * from jsonb_array_elements(new.allocations) loop
    if jsonb_typeof(item) is distinct from 'object' or jsonb_typeof(item->'id') is distinct from 'string' or jsonb_typeof(item->'name') is distinct from 'string' or jsonb_typeof(item->'amount') is distinct from 'number' or jsonb_typeof(item->'kind') is distinct from 'string' or jsonb_typeof(item->'target') is distinct from 'string' or length(item->>'target') > 200 then raise exception 'Invalid allocation field types'; end if;
    ref := (item->>'id')::uuid;
    kind := item->>'kind';
    if ref is null or coalesce(length(trim(item->>'name')), 0) not between 1 and 100 or kind not in ('other','category','card','goal','trip') or kind is null
       or (item->>'amount') is null or (item->>'amount')::numeric < 0 or (item->>'amount')::numeric > 1000000000000
       or round((item->>'amount')::numeric,2) <> (item->>'amount')::numeric then raise exception 'Invalid allocation'; end if;
    -- Only validate a reference when newly selected. Deleted destinations remain historical references.
    if tg_op = 'UPDATE' and exists(select 1 from jsonb_array_elements(old.allocations) a where a->>'id' = item->>'id' and a->>'kind' = kind and a->>'target' = item->>'target') then continue; end if;
    if kind = 'category' and not exists(select 1 from public.categories c where c.name = item->>'target') then raise exception 'Category unavailable'; end if;
    if kind = 'card' and not exists(select 1 from public.credit_cards c where c.id = (item->>'target')::uuid) then raise exception 'Card unavailable'; end if;
    if kind = 'goal' and not exists(select 1 from public.financial_goals g where g.id = (item->>'target')::uuid and g.household_id is not distinct from new.household_id and (new.household_id is not null or g.user_id = new.user_id)) then raise exception 'Goal must belong to the same scope'; end if;
    if kind = 'trip' and not exists(select 1 from public.travel_trips t where t.id = (item->>'target')::uuid) then raise exception 'Trip unavailable'; end if;
  end loop;
  return new;
end $$;

alter table public.future_money_plans add constraint future_plan_finite_date check (isfinite(expected_date));
