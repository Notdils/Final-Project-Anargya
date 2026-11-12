-- 0022: 3D model for the Uprights & Wheel Hub Assembly Kit (wheel hub + brake rotor from the team, 12 Nov).
-- Run after 0021. Safe to re-run.
update public.products set model_url = '/models/parts/wheel-hub.glb' where id = 'p-upright-kit';
