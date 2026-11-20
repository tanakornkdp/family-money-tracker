-- On large production tables create equivalent indexes manually with CONCURRENTLY
-- outside the migration transaction, after checking existing equivalent indexes.
create index if not exists transactions_user_date_desc_idx on public.transactions(user_id, date desc);
create index if not exists transactions_household_date_desc_idx on public.transactions(household_id, date desc);
create index if not exists transactions_card_id_idx on public.transactions(card_id);
create index if not exists transactions_travel_trip_id_idx on public.transactions(travel_trip_id);
-- Service filters and ordering verified against types/database.ts.
create index if not exists receipts_user_created_at_idx on public.receipts(user_id, created_at desc);
create index if not exists travel_trips_user_start_date_idx on public.travel_trips(user_id, start_date desc);
create index if not exists goal_contributions_goal_created_at_idx on public.goal_contributions(goal_id, created_at);
