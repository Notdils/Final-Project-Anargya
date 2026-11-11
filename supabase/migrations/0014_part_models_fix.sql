-- 0014: match each part's 3D model to its name. Run once in Supabase SQL Editor, after 0013. Safe to re-run.
-- Aero package = front wing + rear wing + diffuser in one file. The uprights / wheel hub kit has no model yet,
-- so it shows its render image until the wheel hub file arrives.
update public.products set model_url = '/models/parts/aero-package.glb' where id = 'p-aero-package';
update public.products set model_url = null where id = 'p-upright-kit';
