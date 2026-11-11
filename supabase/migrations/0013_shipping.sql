-- 0013: shipping by destination. Run once in Supabase SQL Editor, after 0012.
-- Checkout asks for the destination country (Asia only) and, for Japan, East or West. The server looks up
-- the zone and its rate here. A zone without a rate uses the flat SHIPPING_FLAT_USD until PLSS sends real rates.
-- [PLACEHOLDER] country list and Japan regions: the team decides; edit with SQL (list) or Admin → Shipping (rates).

create table if not exists public.shipping_zones (
  code text primary key check (code ~ '^[A-Z]{2}(-[A-Z]+)?$'),
  kind text not null check (kind in ('country','jp_region')),
  name text not null,
  rate_usd numeric(10,2) check (rate_usd is null or rate_usd >= 0),
  min_days integer check (min_days is null or min_days between 0 and 120),
  max_days integer check (max_days is null or max_days between 0 and 120),
  active boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.shipping_zones enable row level security;
drop policy if exists "zones public read" on public.shipping_zones;
create policy "zones public read" on public.shipping_zones for select using (active or public.has_perm('shipping.manage'));

-- An earlier draft of this file split Japan by prefecture. Japan is now just East / West, so remove that table
-- and the old 9-region zones if a previous run created them (they hold no orders, only seed rows).
drop table if exists public.jp_prefectures;
delete from public.shipping_zones where kind = 'jp_region' and code not in ('JP-EAST', 'JP-WEST');

-- Indonesia and Myanmar are listed but switched off (content rule / pending decision).
insert into public.shipping_zones (code, kind, name, active) values
  -- [PLACEHOLDER] split: East = Hokkaido, Tohoku, Kanto, Chubu; West = Kansai, Chugoku, Shikoku, Kyushu, Okinawa
  ('JP-EAST', 'jp_region', 'East Japan', true),
  ('JP-WEST', 'jp_region', 'West Japan', true),
  ('CN', 'country', 'China', true),
  ('HK', 'country', 'Hong Kong', true),
  ('MO', 'country', 'Macao', true),
  ('TW', 'country', 'Taiwan', true),
  ('KR', 'country', 'South Korea', true),
  ('MN', 'country', 'Mongolia', true),
  ('SG', 'country', 'Singapore', true),
  ('MY', 'country', 'Malaysia', true),
  ('TH', 'country', 'Thailand', true),
  ('VN', 'country', 'Vietnam', true),
  ('PH', 'country', 'Philippines', true),
  ('BN', 'country', 'Brunei', true),
  ('KH', 'country', 'Cambodia', true),
  ('LA', 'country', 'Laos', true),
  ('TL', 'country', 'Timor-Leste', true),
  ('IN', 'country', 'India', true),
  ('PK', 'country', 'Pakistan', true),
  ('BD', 'country', 'Bangladesh', true),
  ('LK', 'country', 'Sri Lanka', true),
  ('NP', 'country', 'Nepal', true),
  ('BT', 'country', 'Bhutan', true),
  ('MV', 'country', 'Maldives', true),
  ('ID', 'country', 'Indonesia', false),
  ('MM', 'country', 'Myanmar', false)
on conflict (code) do nothing;


alter table public.orders
  add column if not exists ship_country text,
  add column if not exists ship_region text check (ship_region is null or ship_region in ('JP-EAST', 'JP-WEST')),
  add column if not exists shipping_zone text,
  -- optional delivery notes or map link from checkout (max 300, checked by the API too)
  add column if not exists address_note text check (address_note is null or char_length(address_note) <= 300);

-- Shipping rates are managed by Operations and Finance.
create or replace function public.has_perm(p text) returns boolean
language sql stable as $$
  select case public.staff_role()
    when 'admin' then true
    when 'catalog' then p in ('products.read', 'products.write')
    when 'ops' then p in ('orders.read', 'orders.fulfil', 'bookings.read', 'bookings.manage', 'shipping.manage')
    when 'finance' then p in ('overview.read', 'receipts.read', 'orders.read', 'shipping.manage')
    else false
  end
$$;
