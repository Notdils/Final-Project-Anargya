-- 0025: DHL Express rates from PLSS (13 Nov 2026). Rates are per box, per part and per region, in USD
-- (PLSS gave a min-max range; we use the midpoint, as in their summary table). An order pays the sum of
-- qty x rate for every line. Japan: shipping is arranged and paid by the customer, so checkout charges 0.
-- Countries PLSS did not list are switched off. Russia is suspended by DHL and is not offered.

create table if not exists public.shipping_regions (
  code text primary key check (code ~ '^[A-Z_]+$'),
  name text not null,
  dhl_zone text,
  min_days integer check (min_days is null or min_days between 0 and 120),
  max_days integer check (max_days is null or max_days between 0 and 120),
  sort integer not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.shipping_regions enable row level security;
drop policy if exists "regions public read" on public.shipping_regions;
create policy "regions public read" on public.shipping_regions for select using (true);

create table if not exists public.shipping_rates (
  region text not null references public.shipping_regions(code) on delete cascade,
  product_id text not null references public.products(id) on delete cascade,
  rate_usd numeric(10,2) not null check (rate_usd >= 0),
  updated_at timestamptz not null default now(),
  primary key (region, product_id)
);
alter table public.shipping_rates enable row level security;
drop policy if exists "rates public read" on public.shipping_rates;
create policy "rates public read" on public.shipping_rates for select using (true);

alter table public.shipping_zones add column if not exists region text references public.shipping_regions(code);

insert into public.shipping_regions (code, name, dhl_zone, min_days, max_days, sort) values
  ('ASIA_EAST', 'East Asia', 'Zone 1-2', 1, 2, 1),
  ('ASIA_SOUTHEAST', 'Southeast Asia', 'Zone 3', 2, 3, 2),
  ('ASIA_SOUTH', 'South Asia', 'Zone 4', 3, 4, 3),
  ('ASIA_WEST', 'West Asia', 'Zone 8', 3, 5, 4),
  ('ASIA_CENTRAL', 'Central Asia', 'Zone 8', 4, 6, 5)
on conflict (code) do nothing;

-- Only parts that exist in this database (a fresh test database may not have all four).
insert into public.shipping_rates (region, product_id, rate_usd)
select r.region, r.product_id, r.rate_usd
from (values
  ('ASIA_EAST', 'p-vcu-bms', 75.00), ('ASIA_EAST', 'p-pedal-box', 205.00), ('ASIA_EAST', 'p-upright-kit', 470.00), ('ASIA_EAST', 'p-aero-package', 1400.00),
  ('ASIA_SOUTHEAST', 'p-vcu-bms', 92.50), ('ASIA_SOUTHEAST', 'p-pedal-box', 260.00), ('ASIA_SOUTHEAST', 'p-upright-kit', 590.00), ('ASIA_SOUTHEAST', 'p-aero-package', 1725.00),
  ('ASIA_SOUTH', 'p-vcu-bms', 110.00), ('ASIA_SOUTH', 'p-pedal-box', 315.00), ('ASIA_SOUTH', 'p-upright-kit', 720.00), ('ASIA_SOUTH', 'p-aero-package', 2125.00),
  ('ASIA_WEST', 'p-vcu-bms', 132.50), ('ASIA_WEST', 'p-pedal-box', 400.00), ('ASIA_WEST', 'p-upright-kit', 950.00), ('ASIA_WEST', 'p-aero-package', 2675.00),
  ('ASIA_CENTRAL', 'p-vcu-bms', 145.00), ('ASIA_CENTRAL', 'p-pedal-box', 435.00), ('ASIA_CENTRAL', 'p-upright-kit', 1035.00), ('ASIA_CENTRAL', 'p-aero-package', 2900.00)
) as r(region, product_id, rate_usd)
where exists (select 1 from public.products p where p.id = r.product_id)
on conflict (region, product_id) do nothing;

insert into public.shipping_zones (code, kind, name, active) values
  ('AE', 'country', 'United Arab Emirates', true),
  ('SA', 'country', 'Saudi Arabia', true),
  ('QA', 'country', 'Qatar', true),
  ('TR', 'country', 'Turkey', true),
  ('JO', 'country', 'Jordan', true),
  ('KZ', 'country', 'Kazakhstan', true),
  ('UZ', 'country', 'Uzbekistan', true),
  ('KG', 'country', 'Kyrgyzstan', true)
on conflict (code) do nothing;

update public.shipping_zones z set region = m.region, rate_usd = null, min_days = null, max_days = null, active = true, updated_at = now()
from (values
  ('KR', 'ASIA_EAST'), ('TW', 'ASIA_EAST'), ('HK', 'ASIA_EAST'), ('CN', 'ASIA_EAST'),
  ('ID', 'ASIA_SOUTHEAST'), ('MY', 'ASIA_SOUTHEAST'), ('TH', 'ASIA_SOUTHEAST'), ('SG', 'ASIA_SOUTHEAST'), ('VN', 'ASIA_SOUTHEAST'), ('PH', 'ASIA_SOUTHEAST'),
  ('IN', 'ASIA_SOUTH'), ('LK', 'ASIA_SOUTH'), ('BD', 'ASIA_SOUTH'), ('PK', 'ASIA_SOUTH'),
  ('AE', 'ASIA_WEST'), ('SA', 'ASIA_WEST'), ('QA', 'ASIA_WEST'), ('TR', 'ASIA_WEST'), ('JO', 'ASIA_WEST'),
  ('KZ', 'ASIA_CENTRAL'), ('UZ', 'ASIA_CENTRAL'), ('KG', 'ASIA_CENTRAL')
) as m(code, region)
where z.code = m.code and z.region is distinct from m.region;

update public.shipping_zones set active = false, updated_at = now()
where kind = 'country' and region is null and active;

-- Japan: the customer arranges and pays the courier; the zones stay on so Japan can be chosen.
update public.shipping_zones set rate_usd = 0, updated_at = now() where kind = 'jp_region' and rate_usd is distinct from 0;
