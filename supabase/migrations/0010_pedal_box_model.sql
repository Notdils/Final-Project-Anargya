-- 0010: the brake pedal box has its own model now (was showing the rear wing as a preview).
update public.products set model_url = '/models/parts/pedal-box.glb' where id = 'p-pedal-box';
