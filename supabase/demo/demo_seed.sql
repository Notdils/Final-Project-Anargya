-- DEMO DATA for judging. Not a migration: run by hand in Supabase SQL Editor.
-- 1. Turn off "Confirm email" (Authentication > Sign In / Providers > Email).
-- 2. Register both accounts on the website first (any password you choose; share it with the judges).
-- 3. Run migrations 0001-0005 first. Edit the two emails below if you used different ones, then run this file once.
-- Everything it creates is tagged so demo_cleanup.sql can remove it:
--   orders: buyer_name starts with '[DEMO]', midtrans_txn_id starts with 'DEMO-'
--   events: session_id starts with 'demo-'
-- It never touches product stock and creates no Midtrans transactions.

do $$
declare
  admin_email    constant text := 'juri.admin@example.com';
  customer_email constant text := 'juri.customer@example.com';
  admin_id uuid;
  cust_id  uuid;
  fx constant numeric := 16300; -- demo USD -> IDR rate
  i int;
  oid uuid;
  ts timestamptz;
  st text;
  prod record;
  q int;
  names constant text[] := array['[DEMO] Kaito Sato','[DEMO] Yui Tanaka','[DEMO] Ren Suzuki','[DEMO] Hana Ito','[DEMO] Sora Watanabe','[DEMO] Mio Kobayashi'];
  methods constant text[] := array['credit_card','qris','bank_transfer','gopay'];
begin
  select id into admin_id from auth.users where email = admin_email;
  select id into cust_id  from auth.users where email = customer_email;
  if admin_id is null or cust_id is null then
    raise exception 'Register % and % on the website first', admin_email, customer_email;
  end if;

  update auth.users set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
  where id = admin_id;

  -- 18 orders over the last 30 days: mostly paid, some expired or failed, one flagged for review.
  for i in 1..18 loop
    ts := now() - make_interval(days => (i * 37) % 29, hours => (i * 7) % 24);
    st := case when i in (4, 11) then 'expired' when i = 15 then 'failed' else 'paid' end;
    select * into prod from products where active and price_usd is not null order by id offset (i % 4) limit 1;
    q := 1 + (i % 3);
    insert into orders(user_id, email, buyer_name, phone, address, city, postal_code, country,
                       subtotal_usd, shipping_usd, total_usd, fx_usd_idr, charged_idr,
                       status, method, midtrans_txn_id, created_at, paid_at, pay_expires_at)
    values (cust_id, customer_email, names[1 + (i % 6)], '+81 3 0000 0000', '[DEMO] 1-1 Placeholder-cho', 'Tokyo', '100-0001', 'Japan',
            prod.price_usd * q, 0, prod.price_usd * q, fx, ceil(prod.price_usd * q * fx)::bigint,
            st, case when st = 'paid' then methods[1 + (i % 4)] end, 'DEMO-' || lpad(i::text, 4, '0'),
            ts, case when st = 'paid' then ts + interval '3 minutes' end, ts + interval '60 minutes')
    returning id into oid;
    insert into order_items(order_id, product_id, code, name, qty, unit_price_usd)
    values (oid, prod.id, prod.code, prod.name, q, prod.price_usd);
  end loop;

  -- One order Midtrans reported with a different amount: shows the "Needs review" path.
  select * into prod from products where active and price_usd is not null order by id limit 1;
  insert into orders(user_id, email, buyer_name, phone, address, city, postal_code, country,
                     subtotal_usd, shipping_usd, total_usd, fx_usd_idr, charged_idr,
                     status, method, midtrans_txn_id, created_at, pay_expires_at, needs_review, review_note)
  values (cust_id, customer_email, '[DEMO] Riku Kato', '+81 3 0000 0000', '[DEMO] 1-1 Placeholder-cho', 'Tokyo', '100-0001', 'Japan',
          prod.price_usd, 0, prod.price_usd, fx, ceil(prod.price_usd * fx)::bigint,
          'pending', 'bank_transfer', 'DEMO-REVIEW', now() - interval '2 days', now() - interval '2 days' + interval '60 minutes',
          true, 'Midtrans amount ' || (ceil(prod.price_usd * fx)::bigint - 50000) || ' IDR, expected ' || ceil(prod.price_usd * fx)::bigint || ' IDR (demo)')
  returning id into oid;
  insert into order_items(order_id, product_id, code, name, qty, unit_price_usd)
  values (oid, prod.id, prod.code, prod.name, 1, prod.price_usd);

  -- Funnel traffic: 240 sessions, each going a few steps deep.
  insert into events(session_id, type, path, created_at)
  select 'demo-' || lpad(s::text, 6, '0'), 'page_view', p.path, now() - make_interval(days => (s * 13) % 30, mins => (s * 17) % 600) + p.off
  from generate_series(1, 240) s
  cross join lateral (values
    ('/', interval '0 s', true),
    ('/marketplace', interval '40 s', s % 10 < 6),
    ('/marketplace/custom-aero-package', interval '90 s', s % 10 < 4),
    ('/checkout', interval '200 s', s % 20 < 3)
  ) as p(path, off, keep)
  where p.keep;
end $$;

-- Check
select status, count(*), sum(total_usd) as total_usd from orders where buyer_name like '[DEMO]%' group by status order by status;
