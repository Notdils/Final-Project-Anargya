-- 0018: product dimensions from the team (12 Nov). Run after 0017. Safe to re-run.
update public.products set dimensions = '300 × 260 × 300 mm per wheel assembly' where id = 'p-upright-kit';
update public.products set dimensions = E'Front wing 1,380 × 480 × 320 mm\nRear wing 1,150 × 420 × 450 mm\nDiffuser 1,200 × 650 × 180 mm' where id = 'p-aero-package';
update public.products set dimensions = '240 × 180 × 65 mm' where id = 'p-vcu-bms';
update public.products set dimensions = '340 × 260 × 280 mm' where id = 'p-pedal-box';
