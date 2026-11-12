-- Which migrations have not been run? Lists every expected column or table that is missing,
-- with the migration file that adds it. Empty result = database is up to date. Read-only.
with expected(tbl, col, migration) as (values
  ('orders', 'pay_expires_at', '0003_payment_resume.sql'),
  ('orders', 'snap_redirect_url', '0003_payment_resume.sql'),
  ('orders', 'needs_review', '0004_needs_review.sql'),
  ('orders', 'review_note', '0004_needs_review.sql'),
  ('orders', 'total_usd', '0005_usd_catalog.sql'),
  ('products', 'price_usd', '0005_usd_catalog.sql'),
  ('bookings', 'topic', '0006_bookings.sql'),
  ('bookings', 'pay_status', '0008_booking_payment.sql'),
  ('orders', 'fulfilment_status', '0011_rbac_fulfilment_media.sql'),
  ('admin_audit', 'id', '0011_rbac_fulfilment_media.sql'),
  ('shipping_zones', 'code', '0013_shipping.sql'),
  ('orders', 'ship_region', '0013_shipping.sql (latest version)'),
  ('orders', 'address_note', '0013_shipping.sql (latest version)'),
  ('products', 'overview', '0015_product_overview.sql'),
  ('vouchers', 'code', '0016_vouchers.sql'),
  ('orders', 'discount_usd', '0016_vouchers.sql'),
  ('orders', 'idempotency_key', '0020_order_idempotency.sql')
)
select e.migration, e.tbl || '.' || e.col as missing
from expected e
left join information_schema.columns c on c.table_schema = 'public' and c.table_name = e.tbl and c.column_name = e.col
where c.column_name is null
order by e.migration;
