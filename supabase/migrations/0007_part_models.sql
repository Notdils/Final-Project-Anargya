-- 3D models for the 4 parts (files in public/models/parts).
-- PREVIEW mapping (pedal box gets its own model in 0010): the files are a diffuser, front wing + nose, VCU/BMS and rear wing,
-- so the uprights kit and pedal box show aero parts until their own models arrive. Re-run with new paths then.
update public.products set model_url = '/models/parts/diffuser.glb'   where id = 'p-upright-kit';
update public.products set model_url = '/models/parts/front-wing.glb' where id = 'p-aero-package';
update public.products set model_url = '/models/parts/vcu-bms.glb'    where id = 'p-vcu-bms';
update public.products set model_url = '/models/parts/rear-wing.glb'  where id = 'p-pedal-box';
