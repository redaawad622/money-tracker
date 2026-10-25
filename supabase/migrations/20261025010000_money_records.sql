-- One row per synced record (expense, subscription or the settings), per user.
-- Lives in the same Supabase project as Workout Tracker, so one sign-in covers both apps.
-- Deleting on a device sets deleted = true instead of removing the row, so other devices learn of it.
create table public.money_records (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  kind text not null,
  uid text not null,
  data jsonb,
  deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, kind, uid)
);

alter table public.money_records enable row level security;

create policy "Own records only" on public.money_records
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- public.touch_updated_at() is created by Workout Tracker's records migration.
create trigger money_records_touch before update on public.money_records
  for each row execute function public.touch_updated_at();
