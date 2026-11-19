create table public.future_money_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  household_id uuid references public.households(id),
  name text not null check (length(trim(name)) between 1 and 100),
  expected_amount numeric(16,2) not null check (expected_amount > 0 and expected_amount <= 1000000000000),
  expected_date date not null,
  allocations jsonb not null default '[]' check (jsonb_typeof(allocations) = 'array' and jsonb_array_length(allocations) <= 50),
  archived boolean not null default false,
  revision integer not null default 1,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.future_money_plan_links (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.future_money_plans(id),
  allocation_id uuid,
  transaction_id uuid unique references public.transactions(id) on delete cascade,
  contribution_id uuid unique references public.goal_contributions(id) on delete cascade,
  user_id uuid not null references auth.users(id), created_at timestamptz not null default now(),
  check (num_nonnulls(transaction_id, contribution_id) = 1),
  check (contribution_id is null or allocation_id is not null)
);
create table public.future_money_plan_events (
  id uuid primary key default gen_random_uuid(), plan_id uuid not null references public.future_money_plans(id),
  user_id uuid references auth.users(id) on delete set null,
  action text not null, snapshot jsonb not null, created_at timestamptz not null default now()
);
create index on public.future_money_plans(user_id);
create index on public.future_money_plans(household_id);
create index on public.future_money_plan_links(plan_id);
create index on public.future_money_plan_events(plan_id, created_at desc);
alter table public.future_money_plans enable row level security;
alter table public.future_money_plan_links enable row level security;
alter table public.future_money_plan_events enable row level security;
create policy plans_read on public.future_money_plans for select to authenticated using (
  (household_id is null and user_id = (select auth.uid())) or private.is_household_member(household_id, (select auth.uid()))
);
create policy plans_create on public.future_money_plans for insert to authenticated with check (
  user_id = (select auth.uid()) and (household_id is null or private.is_household_member(household_id, (select auth.uid())))
);
create policy plans_edit on public.future_money_plans for update to authenticated using (
  (household_id is null and user_id = (select auth.uid())) or private.is_household_member(household_id, (select auth.uid()))
) with check ((household_id is null and user_id = (select auth.uid())) or private.is_household_member(household_id, (select auth.uid())));
create policy plan_links_read on public.future_money_plan_links for select to authenticated using (exists (select 1 from public.future_money_plans p where p.id = plan_id));
create policy plan_links_create on public.future_money_plan_links for insert to authenticated with check (user_id = (select auth.uid()) and exists (select 1 from public.future_money_plans p where p.id = plan_id));
create policy plan_links_remove on public.future_money_plan_links for delete to authenticated using (exists (select 1 from public.future_money_plans p where p.id = plan_id));
create policy plan_events_read on public.future_money_plan_events for select to authenticated using (exists (select 1 from public.future_money_plans p where p.id = plan_id));
revoke all on public.future_money_plans, public.future_money_plan_links, public.future_money_plan_events from authenticated;
grant select,insert,update on public.future_money_plans to authenticated;
grant select,insert,delete on public.future_money_plan_links to authenticated;
grant select on public.future_money_plan_events to authenticated;
revoke all on public.future_money_plans, public.future_money_plan_links, public.future_money_plan_events from anon;

create function private.validate_future_money_plan() returns trigger language plpgsql security invoker set search_path = '' as $$
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
create trigger validate_future_plan before insert or update on public.future_money_plans for each row execute function private.validate_future_money_plan();

create function private.validate_future_money_link() returns trigger language plpgsql security invoker set search_path = '' as $$
declare p public.future_money_plans; a jsonb; tx public.transactions; contribution public.goal_contributions; goal public.financial_goals;
begin
  select * into p from public.future_money_plans where id = new.plan_id for update;
  if p.id is null or p.archived then raise exception 'Plan unavailable or archived'; end if;
  if new.allocation_id is not null then
    select value into a from jsonb_array_elements(p.allocations) where (value->>'id')::uuid = new.allocation_id;
    if a is null then raise exception 'Allocation not found'; end if;
  end if;
  if new.transaction_id is not null then
    select * into tx from public.transactions where id = new.transaction_id;
    if tx.id is null or tx.household_id is distinct from p.household_id or (p.household_id is null and tx.user_id <> p.user_id) then raise exception 'Transaction must belong to the same scope'; end if;
    if (new.allocation_id is null and tx.type <> 'income') or (new.allocation_id is not null and tx.type <> 'expense') then raise exception 'Incorrect transaction type'; end if;
    if a->>'kind' = 'goal' then raise exception 'Select an actual goal contribution'; end if;
    if a->>'kind' = 'category' and tx.category <> a->>'target' then raise exception 'Category does not match'; end if;
    if a->>'kind' = 'trip' and tx.travel_trip_id is distinct from (a->>'target')::uuid then raise exception 'Trip does not match'; end if;
    -- Card repayments may be paid from another account, so user confirms the matching record explicitly.
  else
    select * into contribution from public.goal_contributions where id = new.contribution_id;
    select * into goal from public.financial_goals where id = contribution.goal_id;
    if contribution.id is null or a->>'kind' <> 'goal' or goal.id is distinct from (a->>'target')::uuid or goal.household_id is distinct from p.household_id or (p.household_id is null and contribution.user_id <> p.user_id) then raise exception 'Goal contribution must match the allocation and scope'; end if;
  end if;
  return new;
end $$;
create trigger validate_future_link before insert on public.future_money_plan_links for each row execute function private.validate_future_money_link();

-- Audit insertion is the only privileged operation; callers cannot execute this internal trigger function.
create function private.audit_future_money_plan() returns trigger language plpgsql security definer set search_path = '' as $$
declare pid uuid; data jsonb;
begin
  if tg_table_name = 'future_money_plans' then pid := new.id; data := to_jsonb(new);
  elsif tg_op = 'DELETE' then pid := old.plan_id; data := to_jsonb(old);
  else pid := new.plan_id; data := to_jsonb(new); end if;
  insert into public.future_money_plan_events(plan_id,user_id,action,snapshot) values(pid,auth.uid(),tg_table_name || ':' || tg_op,data);
  return null;
end $$;
create trigger audit_future_plan after insert or update on public.future_money_plans for each row execute function private.audit_future_money_plan();
create trigger audit_future_link after insert or delete on public.future_money_plan_links for each row execute function private.audit_future_money_plan();
revoke all on function private.validate_future_money_plan(), private.validate_future_money_link(), private.audit_future_money_plan() from public,anon,authenticated;
