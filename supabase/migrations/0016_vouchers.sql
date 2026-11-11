-- 0016: vouchers / discount codes (e.g. a Christmas promo). Run after 0015. Safe to re-run.
--
-- How it works:
--  * A voucher is a code with a percent or fixed USD discount, an optional minimum subtotal, a cap (for percent),
--    a validity window, a total use limit and a per-customer limit, and optionally a list of parts it applies to.
--  * The discount applies to the parts subtotal only (not shipping). Total = subtotal - discount + shipping.
--  * voucher_discount() is the single place the rules live. Checkout calls it for the preview, and the order
--    function calls it again inside the same transaction (voucher row locked), so limits cannot be overshot.
--  * A use counts while its order is pending or paid. Expired or failed orders free the use automatically.

create table if not exists public.vouchers (
  code text primary key check (code ~ '^[A-Z0-9-]{3,24}$'),
  description text check (description is null or char_length(description) <= 200),
  kind text not null check (kind in ('percent', 'fixed')),
  value numeric(10,2) not null check (value > 0),
  max_discount_usd numeric(10,2) check (max_discount_usd is null or max_discount_usd > 0),
  min_subtotal_usd numeric(10,2) not null default 0 check (min_subtotal_usd >= 0),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  max_uses integer check (max_uses is null or max_uses > 0),
  per_user_limit integer not null default 1 check (per_user_limit > 0),
  product_ids text[], -- null = every part
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check (kind <> 'percent' or value <= 100),
  check (ends_at is null or ends_at > starts_at)
);

create table if not exists public.voucher_redemptions (
  order_id uuid primary key references public.orders(id) on delete cascade,
  voucher_code text not null references public.vouchers(code),
  user_id uuid not null,
  discount_usd numeric(12,2) not null,
  created_at timestamptz not null default now()
);
create index if not exists voucher_redemptions_code on public.voucher_redemptions(voucher_code);

alter table public.orders
  add column if not exists voucher_code text,
  add column if not exists discount_usd numeric(12,2) not null default 0;

-- Customers never read the voucher list (no guessing codes); checks go through the server.
alter table public.vouchers enable row level security;
alter table public.voucher_redemptions enable row level security;
drop policy if exists vouchers_staff on public.vouchers;
create policy vouchers_staff on public.vouchers for select using (public.has_perm('products.write'));
drop policy if exists voucher_redemptions_staff on public.voucher_redemptions;
create policy voucher_redemptions_staff on public.voucher_redemptions for select using (public.has_perm('products.write') or public.has_perm('orders.read'));

/** Discount for a cart. Returns the normalised code and discount, or raises 'voucher: <reason>'. */
create or replace function public.voucher_discount(p_user uuid, p_code text, p_items jsonb, p_lock boolean default false)
returns table(code text, discount_usd numeric)
language plpgsql security definer set search_path = public as $$
declare
  v vouchers%rowtype;
  c text := upper(trim(coalesce(p_code, '')));
  sub numeric(12,2) := 0;
  eligible numeric(12,2) := 0;
  used integer;
  mine integer;
  d numeric(12,2);
begin
  if p_lock then select * into v from vouchers where vouchers.code = c for update;
  else select * into v from vouchers where vouchers.code = c; end if;
  if not found or not v.active then raise exception 'voucher: This code is not valid.' using errcode = 'P0002'; end if;
  if now() < v.starts_at then raise exception 'voucher: This code is not active yet.' using errcode = 'P0002'; end if;
  if v.ends_at is not null and now() >= v.ends_at then raise exception 'voucher: This code has expired.' using errcode = 'P0002'; end if;

  select coalesce(sum(p.price_usd * (x.value->>'qty')::int), 0),
         coalesce(sum(p.price_usd * (x.value->>'qty')::int) filter (where v.product_ids is null or p.id = any(v.product_ids)), 0)
    into sub, eligible
    from jsonb_array_elements(p_items) x join products p on p.id = x.value->>'id' and p.active;
  if sub < v.min_subtotal_usd then raise exception 'voucher: Spend at least $% to use this code.', v.min_subtotal_usd using errcode = 'P0002'; end if;
  if eligible <= 0 then raise exception 'voucher: This code does not apply to the parts in your cart.' using errcode = 'P0002'; end if;

  select count(*), count(*) filter (where r.user_id = p_user) into used, mine
    from voucher_redemptions r join orders o on o.id = r.order_id
   where r.voucher_code = v.code and o.status in ('pending', 'paid');
  if v.max_uses is not null and used >= v.max_uses then raise exception 'voucher: This code has been used up.' using errcode = 'P0002'; end if;
  if mine >= v.per_user_limit then raise exception 'voucher: You have already used this code.' using errcode = 'P0002'; end if;

  d := case when v.kind = 'percent' then round(eligible * v.value / 100, 2) else least(v.value, eligible) end;
  if v.max_discount_usd is not null then d := least(d, v.max_discount_usd); end if;
  return query select v.code, d;
end $$;
revoke all on function public.voucher_discount(uuid, text, jsonb, boolean) from public, anon, authenticated;
grant execute on function public.voucher_discount(uuid, text, jsonb, boolean) to service_role;

-- Order creation with an optional voucher (replaces the 5-argument version for new orders).
create or replace function public.create_order_usd_srv(p_user uuid, p_items jsonb, p_contact jsonb, p_shipping_usd numeric, p_fx_usd_idr numeric, p_voucher text)
returns table(order_id uuid, receipt_no text, total_usd numeric, charged_idr bigint)
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := p_user;
  it jsonb;
  prod products%rowtype;
  q integer;
  sub numeric(12,2) := 0;
  ship numeric(12,2) := greatest(coalesce(p_shipping_usd, 0), 0);
  disc numeric(12,2) := 0;
  vcode text;
  oid uuid;
  rno text;
  tot numeric(12,2);
  idr bigint;
begin
  if uid is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  if char_length(coalesce(p_contact->>'email','')) not between 3 and 120
     or char_length(coalesce(p_contact->>'name','')) not between 2 and 80
     or char_length(coalesce(p_contact->>'phone','')) not between 6 and 20
     or char_length(coalesce(p_contact->>'address','')) not between 5 and 200
     or char_length(coalesce(p_contact->>'city','')) not between 2 and 80
     or char_length(coalesce(p_contact->>'postal','')) not between 3 and 10
     or char_length(coalesce(p_contact->>'country','')) not between 2 and 56
  then raise exception 'invalid contact'; end if;
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

  if nullif(trim(coalesce(p_voucher, '')), '') is not null then
    select x.code, x.discount_usd into vcode, disc from voucher_discount(uid, p_voucher, p_items, true) x; -- locks the voucher row
  end if;

  tot := sub - disc + ship;
  idr := ceil(tot * p_fx_usd_idr)::bigint;

  insert into orders(user_id, email, buyer_name, phone, address, city, postal_code, country,
                     subtotal_usd, shipping_usd, total_usd, fx_usd_idr, charged_idr, voucher_code, discount_usd)
  values (uid, p_contact->>'email', p_contact->>'name', p_contact->>'phone', p_contact->>'address',
          p_contact->>'city', p_contact->>'postal', p_contact->>'country',
          sub, ship, tot, p_fx_usd_idr, idr, vcode, disc)
  returning id, orders.receipt_no into oid, rno;

  insert into order_items(order_id, product_id, code, name, qty, unit_price_usd)
  select oid, p.id, p.code, p.name, (x.value->>'qty')::int, p.price_usd
  from jsonb_array_elements(p_items) x join products p on p.id = x.value->>'id';

  if vcode is not null then
    insert into voucher_redemptions(order_id, voucher_code, user_id, discount_usd) values (oid, vcode, uid, disc);
  end if;

  return query select oid, rno, tot, idr;
end $$;
revoke all on function public.create_order_usd_srv(uuid, jsonb, jsonb, numeric, numeric, text) from public, anon, authenticated;
grant execute on function public.create_order_usd_srv(uuid, jsonb, jsonb, numeric, numeric, text) to service_role;
