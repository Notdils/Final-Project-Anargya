-- 0021: product finish (coating) from the team (12 Nov). Run after 0020. Safe to re-run.
update public.products set finish = 'Type III Hard Black Anodized (Mil-Spec)' where id = 'p-upright-kit';
update public.products set finish = 'UV-Resistant Glossy Clear Coat' where id = 'p-aero-package';
update public.products set finish = 'Anodized Natural Silver / Matte Black, Laser-Etched' where id = 'p-vcu-bms';
update public.products set finish = 'Semi-Gloss Coating' where id = 'p-pedal-box';
