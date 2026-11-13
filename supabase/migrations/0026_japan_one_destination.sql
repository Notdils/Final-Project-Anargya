-- 0026: Japan is one destination (no East / West split). The customer pays the courier on delivery,
-- so checkout charges 0. The old East / West zones are switched off, not deleted: past orders keep
-- their ship_region and shipping_zone for the record.
insert into public.shipping_zones (code, kind, name, rate_usd, active)
values ('JP', 'country', 'Japan', 0, true)
on conflict (code) do update set kind = 'country', name = 'Japan', rate_usd = 0, active = true, updated_at = now();

update public.shipping_zones set active = false, updated_at = now()
where kind = 'jp_region' and active;
