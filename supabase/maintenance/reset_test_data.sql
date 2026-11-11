-- Reset test data before a clean run (12 Nov). Run in Supabase SQL Editor. CANNOT BE UNDONE.
--
-- Deletes: all orders and their items, voucher uses, consultation bookings,
--          admin audit log, rate-limit counters, and every user's saved shipping address.
-- Resets:  receipt numbers start again at ANR-2026-000001; stock goes back to 8 / 5 / 12 / 6.
-- Keeps:   user accounts and their roles, products (prices, specs, models), vouchers, shipping rates.
-- Midtrans sandbox keeps its own transaction history; that does not affect the site.

begin;

delete from public.voucher_redemptions;
delete from public.order_items;
delete from public.orders;
delete from public.bookings;
delete from public.admin_audit;
delete from public.rate_limits;

alter sequence public.receipt_seq restart with 1;

update public.products set stock = 8  where id = 'p-upright-kit';
update public.products set stock = 5  where id = 'p-aero-package';
update public.products set stock = 12 where id = 'p-vcu-bms';
update public.products set stock = 6  where id = 'p-pedal-box';

update auth.users set raw_user_meta_data = raw_user_meta_data - 'shipping_address' where raw_user_meta_data ? 'shipping_address';

commit;

-- Check: every count should be 0.
select (select count(*) from public.orders) as orders, (select count(*) from public.bookings) as bookings,
       (select count(*) from public.voucher_redemptions) as voucher_uses;
