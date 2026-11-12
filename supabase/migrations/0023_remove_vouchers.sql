-- 0023: remove vouchers / discount codes (not part of the plan, 13 Nov). Run after 0022. Safe to re-run.
--
-- * Order creation keeps its 6-argument signature; p_voucher is accepted and ignored, so the app works the
--   same before and after this migration.
-- * The voucher tables and voucher_discount() are dropped.
-- * orders.voucher_code and orders.discount_usd stay as history: old orders keep their numbers, new ones get
--   null / 0 from the column defaults.

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
revoke all on function public.create_order_usd_srv(uuid, jsonb, jsonb, numeric, numeric, text) from public, anon, authenticated;
grant execute on function public.create_order_usd_srv(uuid, jsonb, jsonb, numeric, numeric, text) to service_role;

drop function if exists public.voucher_discount(uuid, text, jsonb, boolean);
drop table if exists public.voucher_redemptions;
drop table if exists public.vouchers;
