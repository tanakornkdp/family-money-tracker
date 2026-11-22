-- Approved production category/title template, snapshot 2026-11-22.
-- Only auth-user INSERT triggers use these constants; existing accounts and
-- transactions are never modified. No source account IDs, balances or history.
-- SECURITY DEFINER is required for the Auth signup trigger to seed owner rows
-- before the new user has an authenticated session; not a callable data API.

create or replace function public.handle_new_user_categories() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.categories (user_id, name, type, icon) values
    (new.id, 'เกมส์', 'both', '🎮'),
    (new.id, 'ขนม', 'expense', '🍔'),
    (new.id, 'ของใช้ในบ้าน', 'expense', '🛋️'),
    (new.id, 'ค่าเช่า/ที่อยู่อาศัย', 'expense', '🏠'),
    (new.id, 'ค่าน้ำ', 'expense', '💧'),
    (new.id, 'ค่าไฟ', 'expense', '💡'),
    (new.id, 'ค่าสื่อสาร', 'expense', '📱'),
    (new.id, 'เครื่องดื่ม', 'both', '☕'),
    (new.id, 'เงินเดือน', 'income', '💵'),
    (new.id, 'ช้อปปิ้ง', 'expense', '🛒'),
    (new.id, 'เดินทาง', 'expense', '🚌'),
    (new.id, 'ที่พัก', 'expense', '🏠'),
    (new.id, 'น้ำมันรถ', 'both', '⛽'),
    (new.id, 'บันเทิง', 'expense', '🎬'),
    (new.id, 'โบนัส', 'income', '💵'),
    (new.id, 'รายได้พิเศษ', 'income', '🏦'),
    (new.id, 'สุขภาพ', 'expense', '🏋️'),
    (new.id, 'อาหาร', 'expense', '🍱')
  on conflict (user_id, name) do nothing;
  return new;
end;
$$;
revoke all on function public.handle_new_user_categories() from public, anon;
grant execute on function public.handle_new_user_categories() to authenticated;

create or replace function public.handle_new_user_titles() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.transaction_titles (user_id, name, type, category, icon) values
    (new.id, 'Netflix', 'expense', 'บันเทิง', '💰'),
    (new.id, 'Youtube', 'expense', 'บันเทิง', '💰'),
    (new.id, 'กาแฟ', 'expense', 'เครื่องดื่ม', '💰'),
    (new.id, 'ขนม', 'expense', 'ขนม', '💰'),
    (new.id, 'ค่าเกมส์', 'expense', 'เกมส์', '💰'),
    (new.id, 'ค่าของใช้ในบ้าน', 'expense', 'ของใช้ในบ้าน', '💰'),
    (new.id, 'ค่าเดินทาง', 'expense', 'เดินทาง', '💰'),
    (new.id, 'ค่าที่พัก', 'expense', 'ที่พัก', '💰'),
    (new.id, 'ค่าโทรศัพท์และอินเทอร์เน็ต', 'expense', 'ค่าสื่อสาร', '💰'),
    (new.id, 'ค่าน้ำ', 'expense', 'ค่าน้ำ', '💰'),
    (new.id, 'ค่าไฟ', 'expense', 'ค่าไฟ', '💰'),
    (new.id, 'ค่าอาหาร', 'expense', 'อาหาร', '💰'),
    (new.id, 'เงินเดือน', 'income', 'เงินเดือน', '💰'),
    (new.id, 'โบนัส', 'income', 'โบนัส', '💰')
  on conflict (user_id, name) do nothing;
  return new;
end;
$$;
revoke all on function public.handle_new_user_titles() from public, anon;
grant execute on function public.handle_new_user_titles() to authenticated;

-- Existing deployments already have these triggers. Fresh baselines need them too.
do $$
begin
  if not exists (select 1 from pg_catalog.pg_trigger where tgrelid = 'auth.users'::regclass and tgname = 'on_auth_user_created_categories') then
    create trigger on_auth_user_created_categories after insert on auth.users for each row execute function public.handle_new_user_categories();
  end if;
  if not exists (select 1 from pg_catalog.pg_trigger where tgrelid = 'auth.users'::regclass and tgname = 'on_auth_user_created_titles') then
    create trigger on_auth_user_created_titles after insert on auth.users for each row execute function public.handle_new_user_titles();
  end if;
end;
$$;
