-- 0006: consultation bookings. Run once in Supabase SQL Editor, after 0005.
-- Writes only go through the server (service role) after validation and rate limiting.
-- The public can see which slots are taken (no personal data) through taken_slots().

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  name text not null check (char_length(name) between 2 and 80),
  email text not null check (char_length(email) between 3 and 120),
  organisation text not null check (char_length(organisation) between 2 and 120),
  topic text not null check (topic in ('concept','aero','powertrain','chassis','other')),
  slot_date date not null,
  slot_time text not null check (slot_time in ('09:00','11:00','14:00','16:00')),
  message text check (message is null or char_length(message) <= 1000),
  status text not null default 'requested' check (status in ('requested','confirmed','cancelled')),
  admin_note text,
  created_at timestamptz not null default now()
);
-- one active booking per slot
create unique index if not exists bookings_slot_unique on public.bookings(slot_date, slot_time) where status <> 'cancelled';
create index if not exists bookings_date_idx on public.bookings(slot_date, slot_time);

alter table public.bookings enable row level security;
drop policy if exists "bookings admin read" on public.bookings;
drop policy if exists "bookings admin update" on public.bookings;
create policy "bookings admin read" on public.bookings for select using (public.is_admin());
create policy "bookings admin update" on public.bookings for update using (public.is_admin()) with check (public.is_admin());

create or replace function public.taken_slots(p_from date, p_to date)
returns table(slot_date date, slot_time text)
language sql stable security definer set search_path = public as $$
  select b.slot_date, b.slot_time from bookings b
  where b.status <> 'cancelled' and b.slot_date between p_from and least(p_to, p_from + 90)
$$;
revoke all on function public.taken_slots(date, date) from public;
grant execute on function public.taken_slots(date, date) to anon, authenticated, service_role;
