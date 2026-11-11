-- 0017: prices and consulting topics from the SPD (12 Nov). Run after 0016. Safe to re-run.
-- Prices: SPD Year 1 target revenue per part / 10 units. Paid orders keep their own unit prices (order_items).
update public.products set price_usd = 3300 where id = 'p-upright-kit';
update public.products set price_usd = 4620 where id = 'p-aero-package';
update public.products set price_usd = 1210 where id = 'p-vcu-bms';
update public.products set price_usd = 1650 where id = 'p-pedal-box';

-- Consulting topics: new ids, old ids kept so existing bookings stay valid.
alter table public.bookings drop constraint if exists bookings_topic_check;
alter table public.bookings add constraint bookings_topic_check check (topic in (
  'inspection', 'electrical', 'powertrain', 'compliance', 'design', 'other',
  'concept', 'aero', 'chassis'
));
