-- 0005: four-part catalog priced in USD (Finance selling prices), USD order totals.
-- Run once in Supabase SQL Editor, after 0004. Old products are kept (orders reference them)
-- but deactivated and renamed so their codes and slugs are free.

-- products
alter table public.products alter column price_jpy drop not null;
alter table public.products
  add column if not exists price_usd numeric(10,2) check (price_usd > 0),
  add column if not exists unit text not null default 'unit',
  add column if not exists image_url text;

update public.products
set active = false, featured = false,
    code = code || '-OLD', slug = slug || '-old'
where price_usd is null and code not like '%-OLD';

insert into public.products(id, slug, code, name, category, price_usd, unit, stock, lead_time, material, weight, dimensions, fits, finish, description, featured, active, image_url)
values
  ('p-upright-kit', 'uprights-wheel-hub-kit', 'AN-SUSP-01', 'Uprights & Wheel Hub Assembly Kit', 'suspension', 2880, 'set', 8,
   null, null, null, null, null, null,
   'Upright, wheel hub, bearing and brake caliper mounts as one matched corner assembly for a formula EV.', true, true, '/parts/uprights-wheel-hub-kit.webp'),
  ('p-aero-package', 'custom-aero-package', 'AN-AERO-01', 'Custom Aero Package (Wings & Diffuser)', 'aero', 3600, 'kit', 5,
   null, null, null, null, null, null,
   'Front wing, rear wing and diffuser designed together and tuned to the car''s downforce and balance targets.', true, true, '/parts/custom-aero-package.webp'),
  ('p-vcu-bms', 'custom-vcu-bms-unit', 'AN-ELEC-01', 'Custom VCU & BMS Unit (EV)', 'electrical', 960, 'unit', 12,
   null, null, null, null, null, null,
   'Vehicle control unit and battery management system in one enclosure, configured for your pack and motor controller.', true, true, '/parts/custom-vcu-bms-unit.webp'),
  ('p-pedal-box', 'brake-pedal-box', 'AN-CHAS-01', 'Custom Brake Pedal Box & Master Cylinder', 'chassis', 1440, 'set', 6,
   null, null, null, null, null, null,
   'Adjustable pedal box with throttle and brake pedals and dual master cylinders, sized to your driver and chassis.', true, true, '/parts/brake-pedal-box.webp')
on conflict (id) do update set
  slug = excluded.slug, code = excluded.code, name = excluded.name, category = excluded.category,
  price_usd = excluded.price_usd, unit = excluded.unit, description = excluded.description,
  featured = excluded.featured, active = excluded.active, image_url = excluded.image_url;

-- orders: USD totals (JPY columns stay for orders placed before this migration)
alter table public.orders alter column subtotal_jpy drop not null;
alter table public.orders alter column shipping_jpy drop not null;
alter table public.orders alter column total_jpy drop not null;
alter table public.orders alter column fx_rate drop not null;
alter table public.orders
  add column if not exists subtotal_usd numeric(12,2),
  add column if not exists shipping_usd numeric(12,2),
  add column if not exists total_usd numeric(12,2),
  add column if not exists fx_usd_idr numeric;

alter table public.order_items alter column unit_price_jpy drop not null;
alter table public.order_items add column if not exists unit_price_usd numeric(10,2);

create or replace function public.create_order_usd(p_items jsonb, p_contact jsonb, p_shipping_usd numeric, p_fx_usd_idr numeric)
returns table(order_id uuid, receipt_no text, total_usd numeric, charged_idr bigint)
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  it jsonb;
  prod products%rowtype;
  q integer;
  sub numeric(12,2) := 0;
  ship numeric(12,2) := greatest(coalesce(p_shipping_usd, 0), 0);
  oid uuid;
  rno text;
  tot numeric(12,2);
  idr bigint;
begin
  if uid is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  if p_fx_usd_idr is null or p_fx_usd_idr <= 0 then raise exception 'fx not configured'; end if;
  if jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 20 then raise exception 'invalid cart'; end if;

  for it in select value from jsonb_array_elements(p_items) order by value->>'id' loop
    q := (it->>'qty')::int;
    select * into prod from products where id = it->>'id' and active for update;
    if not found or prod.price_usd is null then raise exception 'product % unavailable', it->>'id'; end if;
    if q < 1 or q > 20 then raise exception 'invalid quantity'; end if;
    if prod.stock < q then raise exception 'insufficient stock for %', prod.code using errcode = 'P0001'; end if;
    sub := sub + prod.price_usd * q;
  end loop;

  tot := sub + ship;
  idr := ceil(tot * p_fx_usd_idr)::bigint;

  insert into orders(user_id, email, buyer_name, phone, address, city, postal_code, country,
                     subtotal_usd, shipping_usd, total_usd, fx_usd_idr, charged_idr)
  values (uid, p_contact->>'email', p_contact->>'name', p_contact->>'phone', p_contact->>'address',
          p_contact->>'city', p_contact->>'postal', p_contact->>'country',
          sub, ship, tot, p_fx_usd_idr, idr)
  returning id, orders.receipt_no into oid, rno;

  insert into order_items(order_id, product_id, code, name, qty, unit_price_usd)
  select oid, p.id, p.code, p.name, (x.value->>'qty')::int, p.price_usd
  from jsonb_array_elements(p_items) x join products p on p.id = x.value->>'id';

  return query select oid, rno, tot, idr;
end $$;
revoke all on function public.create_order_usd(jsonb, jsonb, numeric, numeric) from public, anon;
grant execute on function public.create_order_usd(jsonb, jsonb, numeric, numeric) to authenticated;

-- the JPY path is retired
revoke execute on function public.create_order(jsonb, jsonb, integer, numeric) from authenticated;
