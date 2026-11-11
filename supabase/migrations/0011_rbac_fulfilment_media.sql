-- 0011: role-based admin access, order fulfilment, product media, audit log. Run once in Supabase SQL Editor, after 0010.
--
-- Roles live in auth.users.raw_app_meta_data.role (users cannot edit app_metadata):
--   admin   everything, including users and roles
--   catalog products (prices, stock, media)
--   ops     orders and fulfilment, consultation bookings
--   finance overview, receipts and exports, orders (read only)
--   (none)  customer
-- Keep this table in sync with src/lib/rbac.ts.

create or replace function public.staff_role() returns text
language sql stable as $$
  select nullif(auth.jwt() -> 'app_metadata' ->> 'role', '')
$$;

create or replace function public.has_perm(p text) returns boolean
language sql stable as $$
  select case public.staff_role()
    when 'admin' then true
    when 'catalog' then p in ('products.read', 'products.write')
    when 'ops' then p in ('orders.read', 'orders.fulfil', 'bookings.read', 'bookings.manage')
    when 'finance' then p in ('overview.read', 'receipts.read', 'orders.read')
    else false
  end
$$;

-- ---------- policies: replace admin-only checks with permissions ----------
drop policy if exists "products readable" on public.products;
drop policy if exists "products admin write" on public.products;
create policy "products readable" on public.products for select using (active or public.has_perm('products.read'));
drop policy if exists "products staff write" on public.products;
create policy "products staff write" on public.products for all using (public.has_perm('products.write')) with check (public.has_perm('products.write'));

drop policy if exists "orders own or admin" on public.orders;
drop policy if exists "orders own or staff" on public.orders;
create policy "orders own or staff" on public.orders for select using (user_id = auth.uid() or public.has_perm('orders.read') or public.has_perm('receipts.read'));

drop policy if exists "items own or admin" on public.order_items;
drop policy if exists "items own or staff" on public.order_items;
create policy "items own or staff" on public.order_items for select using (
  exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.has_perm('orders.read') or public.has_perm('receipts.read')))
);

drop policy if exists "events admin read" on public.events;
drop policy if exists "events staff read" on public.events;
create policy "events staff read" on public.events for select using (public.has_perm('overview.read'));

drop policy if exists "bookings admin read" on public.bookings;
drop policy if exists "bookings admin update" on public.bookings;
drop policy if exists "bookings staff read" on public.bookings;
create policy "bookings staff read" on public.bookings for select using (public.has_perm('bookings.read'));
drop policy if exists "bookings staff update" on public.bookings;
create policy "bookings staff update" on public.bookings for update using (public.has_perm('bookings.manage')) with check (public.has_perm('bookings.manage'));

create or replace function public.funnel_counts(p_from timestamptz, p_to timestamptz)
returns table(step text, sessions bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_perm('overview.read') then raise exception 'forbidden'; end if;
  return query
  with e as (select * from events where created_at between p_from and p_to)
  select 'home', count(distinct session_id) from e where path = '/'
  union all select 'marketplace', count(distinct session_id) from e where path = '/marketplace'
  union all select 'part', count(distinct session_id) from e where path like '/marketplace/%'
  union all select 'checkout', count(distinct session_id) from e where path = '/checkout'
  union all select 'paid', count(*) from orders where status = 'paid' and paid_at between p_from and p_to;
end $$;

-- ---------- fulfilment ----------
alter table public.orders
  add column if not exists fulfilment_status text not null default 'to_pack',
  add column if not exists carrier text check (carrier is null or char_length(carrier) <= 60),
  add column if not exists tracking_no text check (tracking_no is null or char_length(tracking_no) <= 60),
  add column if not exists shipped_at timestamptz,
  add column if not exists delivered_at timestamptz;
alter table public.orders drop constraint if exists orders_fulfilment_status_check;
alter table public.orders add constraint orders_fulfilment_status_check check (fulfilment_status in ('to_pack','shipped','delivered'));

-- ---------- audit log (written by the server with the service role) ----------
create table if not exists public.admin_audit (
  id bigint generated always as identity primary key,
  actor uuid,
  actor_email text,
  action text not null,
  target text,
  detail jsonb,
  created_at timestamptz not null default now()
);
alter table public.admin_audit enable row level security;
drop policy if exists "audit admin read" on public.admin_audit;
create policy "audit admin read" on public.admin_audit for select using (public.staff_role() = 'admin');

-- ---------- product media bucket (public read; uploads only through the server) ----------
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit)
    values ('part-media', 'part-media', true, 10485760)
    on conflict (id) do update set public = true, file_size_limit = 10485760;
  end if;
end $$;
