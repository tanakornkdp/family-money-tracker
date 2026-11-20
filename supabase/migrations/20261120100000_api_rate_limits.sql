create table if not exists public.api_rate_limits (
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null check (key in ('ai-chat','ai-analyze','ai-receipt-analyze','ocr')),
  window_seconds integer not null check (window_seconds in (60,3600,86400)),
  window_start timestamptz not null,
  request_count integer not null check (request_count between 1 and 1000),
  primary key (user_id,key,window_seconds)
);
alter table public.api_rate_limits enable row level security;
revoke all on public.api_rate_limits from public, anon, authenticated;

-- Definer is required solely to update this otherwise inaccessible quota table.
-- Identity is always auth.uid(), never p_key or a client-supplied user ID.
-- The bounded key/window sets cap storage at 12 buckets per user. Different
-- windows cannot reset the server's hourly bucket; a higher p_limit can only
-- consume more of that user's quota, never erase previous calls.
create or replace function public.check_rate_limit(p_key text,p_limit integer,p_window_seconds integer)
returns table(allowed boolean,retry_after_seconds integer)
language plpgsql volatile security definer set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  starts timestamptz;
  used integer;
begin
  if caller is null then raise exception using errcode='42501',message='Authentication required'; end if;
  if p_key is null or p_key not in ('ai-chat','ai-analyze','ai-receipt-analyze','ocr') or p_limit is null or p_limit not between 1 and 1000 or p_window_seconds is null or p_window_seconds not in (60,3600,86400) then
    raise exception using errcode='22023',message='Invalid rate limit configuration';
  end if;
  starts := pg_catalog.to_timestamp(pg_catalog.floor(extract(epoch from pg_catalog.clock_timestamp()) / p_window_seconds) * p_window_seconds);
  insert into public.api_rate_limits as limits(user_id,key,window_seconds,window_start,request_count)
  values(caller,p_key,p_window_seconds,starts,1)
  on conflict(user_id,key,window_seconds) do update set
    request_count = case when limits.window_start < excluded.window_start then 1 else limits.request_count + 1 end,
    window_start = greatest(limits.window_start,excluded.window_start)
  where limits.window_start < excluded.window_start or (limits.window_start=excluded.window_start and limits.request_count < p_limit)
  returning request_count into used;
  allowed := found;
  if allowed then retry_after_seconds:=0;
  else
    select limits.window_start into starts from public.api_rate_limits as limits where limits.user_id=caller and limits.key=p_key and limits.window_seconds=p_window_seconds;
    retry_after_seconds := greatest(1,pg_catalog.ceil(extract(epoch from starts + pg_catalog.make_interval(secs=>p_window_seconds) - pg_catalog.clock_timestamp()))::integer);
  end if;
  return next;
end;
$$;
revoke all on function public.check_rate_limit(text,integer,integer) from public,anon;
grant execute on function public.check_rate_limit(text,integer,integer) to authenticated;
