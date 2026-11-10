-- Anargya Corp schema. Run in Supabase SQL editor (or `supabase db push`).
-- Security model:
--   * Clients never write orders, stock or events directly. Orders go through create_order()
--     (prices and stock are read from the DB inside one transaction with SELECT ... FOR UPDATE).
--   * Payment status and stock decrement only happen in mark_order_paid(), callable by the
--     service role from the Midtrans webhook after signature verification.
--   * Role lives in auth.users.raw_app_meta_data.role (users cannot edit app_metadata).

create extension if not exists pgcrypto;

-- ---------- helpers ----------
create or replace function public.is_admin() returns boolean
language sql stable as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)
$$;

-- ---------- products ----------
create table if not exists public.products (
  id text primary key,
  slug text not null unique,
  code text not null unique,
  name text not null,
  category text not null check (category in ('aero','electrical','chassis','drivetrain','suspension')),
  price_jpy integer not null check (price_jpy > 0),
  stock integer not null default 0 check (stock >= 0),
  lead_time text, material text, weight text, dimensions text, fits text, finish text, description text,
  featured boolean not null default false,
  active boolean not null default true,
  model_url text,
  created_at timestamptz not null default now()
);
alter table public.products enable row level security;
create policy "products readable" on public.products for select using (active or public.is_admin());
create policy "products admin write" on public.products for all using (public.is_admin()) with check (public.is_admin());

-- ---------- orders ----------
create sequence if not exists public.receipt_seq;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  receipt_no text not null unique default (
    'ANR-' || to_char(now() at time zone 'Asia/Tokyo', 'YYYY') || '-' || lpad(nextval('public.receipt_seq')::text, 6, '0')
  ),
  user_id uuid not null references auth.users(id) on delete restrict,
  email text not null,
  buyer_name text not null,
  phone text not null,
  address text not null,
  city text not null,
  postal_code text not null,
  country text not null,
  subtotal_jpy integer not null check (subtotal_jpy >= 0),
  shipping_jpy integer not null default 0 check (shipping_jpy >= 0),
  total_jpy integer not null check (total_jpy >= 0),
  fx_rate numeric(14,6) not null check (fx_rate > 0),
  charged_idr bigint not null check (charged_idr > 0),
  status text not null default 'pending' check (status in ('pending','paid','failed','expired')),
  method text,
  midtrans_txn_id text,
  oversold boolean not null default false, -- paid but stock ran out: Finance must refund or restock
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create index if not exists orders_user_idx on public.orders(user_id, created_at desc);
create index if not exists orders_status_idx on public.orders(status, created_at desc);
alter table public.orders enable row level security;
create policy "orders own or admin" on public.orders for select using (user_id = auth.uid() or public.is_admin());

create table if not exists public.order_items (
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id text not null references public.products(id),
  code text not null,
  name text not null,
  qty integer not null check (qty between 1 and 20),
  unit_price_jpy integer not null check (unit_price_jpy > 0),
  primary key (order_id, product_id)
);
alter table public.order_items enable row level security;
create policy "items own or admin" on public.order_items for select using (
  exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_admin()))
);

-- ---------- analytics events (first-party, anonymous session id) ----------
create table if not exists public.events (
  id bigserial primary key,
  session_id text not null check (length(session_id) between 8 and 64),
  type text not null check (type in ('page_view')),
  path text not null check (length(path) <= 200),
  created_at timestamptz not null default now()
);
create index if not exists events_time_idx on public.events(created_at);
alter table public.events enable row level security;
create policy "events admin read" on public.events for select using (public.is_admin());

-- ---------- rate limiting (fixed window, per key) ----------
create table if not exists public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (key, window_start)
);
alter table public.rate_limits enable row level security; -- no policies: service role only

create or replace function public.hit_rate_limit(p_key text, p_window_seconds integer)
returns integer language plpgsql security definer set search_path = public as $$
declare
  w timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  n integer;
begin
  insert into rate_limits(key, window_start, hits) values (p_key, w, 1)
  on conflict (key, window_start) do update set hits = rate_limits.hits + 1
  returning hits into n;
  delete from rate_limits where window_start < now() - interval '1 day';
  return n; -- hits in the current window
end $$;

-- ---------- create_order: atomic, prices from DB ----------
create or replace function public.create_order(p_items jsonb, p_contact jsonb, p_shipping_jpy integer, p_fx numeric)
returns table(order_id uuid, receipt_no text, total_jpy integer, charged_idr bigint)
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  it jsonb;
  prod products%rowtype;
  q integer;
  sub integer := 0;
  oid uuid;
  rno text;
  tot integer;
  idr bigint;
begin
  if uid is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  if jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 20 then raise exception 'invalid cart'; end if;

  -- lock rows in a stable order to avoid deadlocks
  for it in select value from jsonb_array_elements(p_items) order by value->>'id' loop
    q := (it->>'qty')::int;
    select * into prod from products where id = it->>'id' and active for update;
    if not found then raise exception 'product % unavailable', it->>'id'; end if;
    if q < 1 or q > 20 then raise exception 'invalid quantity'; end if;
    if prod.stock < q then raise exception 'insufficient stock for %', prod.code using errcode = 'P0001'; end if;
    sub := sub + prod.price_jpy * q;
  end loop;

  tot := sub + greatest(p_shipping_jpy, 0);
  idr := ceil(tot * p_fx)::bigint;

  insert into orders(user_id, email, buyer_name, phone, address, city, postal_code, country,
                     subtotal_jpy, shipping_jpy, total_jpy, fx_rate, charged_idr)
  values (uid, p_contact->>'email', p_contact->>'name', p_contact->>'phone', p_contact->>'address',
          p_contact->>'city', p_contact->>'postal', p_contact->>'country',
          sub, greatest(p_shipping_jpy, 0), tot, p_fx, idr)
  returning id, orders.receipt_no into oid, rno;

  insert into order_items(order_id, product_id, code, name, qty, unit_price_jpy)
  select oid, p.id, p.code, p.name, (x.value->>'qty')::int, p.price_jpy
  from jsonb_array_elements(p_items) x join products p on p.id = x.value->>'id';

  return query select oid, rno, tot, idr;
end $$;
revoke all on function public.create_order(jsonb, jsonb, integer, numeric) from public, anon;
grant execute on function public.create_order(jsonb, jsonb, integer, numeric) to authenticated;

-- ---------- payment status (service role only, called by the verified Midtrans webhook) ----------
create or replace function public.mark_order_paid(p_order uuid, p_txn text, p_method text)
returns void language plpgsql security definer set search_path = public as $$
declare
  short boolean;
begin
  -- idempotent: only pending orders transition
  perform 1 from orders where id = p_order and status = 'pending' for update;
  if not found then return; end if;

  -- lock the products of this order, then check stock before touching it
  perform 1 from products p join order_items i on i.product_id = p.id where i.order_id = p_order for update of p;
  select exists (
    select 1 from order_items i join products p on p.id = i.product_id
    where i.order_id = p_order and p.stock < i.qty
  ) into short;

  if short then
    -- money was taken but the last unit went to another buyer: keep the payment, flag for Finance
    update orders set status = 'paid', paid_at = now(), midtrans_txn_id = p_txn, method = p_method, oversold = true
    where id = p_order;
    return;
  end if;

  update products p set stock = p.stock - i.qty
  from order_items i where i.order_id = p_order and p.id = i.product_id;

  update orders set status = 'paid', paid_at = now(), midtrans_txn_id = p_txn, method = p_method
  where id = p_order;
end $$;

create or replace function public.mark_order_status(p_order uuid, p_status text, p_txn text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_status not in ('failed','expired') then raise exception 'invalid status'; end if;
  update orders set status = p_status, midtrans_txn_id = coalesce(p_txn, midtrans_txn_id)
  where id = p_order and status = 'pending';
end $$;

revoke all on function public.mark_order_paid(uuid, text, text) from public, anon, authenticated;
revoke all on function public.mark_order_status(uuid, text, text) from public, anon, authenticated;
revoke all on function public.hit_rate_limit(text, integer) from public, anon, authenticated;
-- explicit grants for the server (secret / service_role key)
grant execute on function public.mark_order_paid(uuid, text, text) to service_role;
grant execute on function public.mark_order_status(uuid, text, text) to service_role;
grant execute on function public.hit_rate_limit(text, integer) to service_role;

-- ---------- funnel for admin dashboard ----------
create or replace function public.funnel_counts(p_from timestamptz, p_to timestamptz)
returns table(step text, sessions bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return query
  with e as (select * from events where created_at between p_from and p_to)
  select 'home', count(distinct session_id) from e where path = '/'
  union all select 'marketplace', count(distinct session_id) from e where path = '/marketplace'
  union all select 'part', count(distinct session_id) from e where path like '/marketplace/%'
  union all select 'checkout', count(distinct session_id) from e where path = '/checkout'
  union all select 'paid', count(*) from orders where status = 'paid' and paid_at between p_from and p_to;
end $$;
