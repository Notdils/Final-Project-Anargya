-- Removes everything demo_seed.sql created. Accounts stay (delete them in Authentication > Users if needed).
delete from public.orders where buyer_name like '[DEMO]%' and midtrans_txn_id like 'DEMO-%';  -- order_items cascade
delete from public.events where session_id like 'demo-%';
select 'demo data removed' as result;
