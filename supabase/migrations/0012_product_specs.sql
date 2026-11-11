-- 0012: specifications of the 4 parts (from the team, 11 Nov). Dimensions and finish are still placeholders.
-- After this, specs can also be edited in Admin → Products.
update public.products set material = 'Aluminium, high-tensile alloy steel', weight = '4–4.5 kg per set',
  fits = 'Formula Student 10" or 13" wheels (PCD 4×98 / 4×100)', lead_time = '3–4 weeks' where id = 'p-upright-kit';
update public.products set material = 'Carbon fiber, aluminium', weight = '9–11 kg total',
  fits = 'FSAE-standard tubular spaceframe or monocoque chassis', lead_time = '4–5 weeks' where id = 'p-aero-package';
update public.products set material = 'Aluminium', weight = '1.2–1.8 kg total',
  fits = 'EV powertrains, configured to your team''s communication protocol', lead_time = '3–4 weeks' where id = 'p-vcu-bms';
update public.products set material = 'Aluminium', weight = '2.8–3.4 kg',
  fits = 'Hydraulic braking systems', lead_time = '2–3 weeks' where id = 'p-pedal-box';
