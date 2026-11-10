-- Placeholder catalog (names, prices and stock are PLACEHOLDERS until Fundraising/Finance confirm).
insert into public.products (id, slug, code, name, category, price_jpy, stock, featured) values
  ('p-aero-01','front-wing','AN-AERO-01','[PLACEHOLDER] Front wing','aero',10000,3,true),
  ('p-aero-02','rear-wing','AN-AERO-02','[PLACEHOLDER] Rear wing','aero',10000,12,true),
  ('p-susp-01','damper-set','AN-SUSP-01','[PLACEHOLDER] Damper set','suspension',10000,8,true),
  ('p-susp-02','brake-rotor','AN-SUSP-02','[PLACEHOLDER] Brake rotor','suspension',10000,2,true),
  ('p-elec-01','battery-enclosure','AN-ELEC-01','[PLACEHOLDER] Battery enclosure','electrical',10000,5,true),
  ('p-elec-02','wiring-harness','AN-ELEC-02','[PLACEHOLDER] Wiring harness','electrical',10000,10,false),
  ('p-chas-01','upright','AN-CHAS-01','[PLACEHOLDER] Upright','chassis',10000,6,true),
  ('p-chas-02','wishbone-set','AN-CHAS-02','[PLACEHOLDER] Wishbone set','chassis',10000,1,false),
  ('p-driv-01','motor-housing','AN-DRIV-01','[PLACEHOLDER] Motor housing','drivetrain',10000,4,false),
  ('p-driv-02','radiator','AN-DRIV-02','[PLACEHOLDER] Radiator','drivetrain',10000,9,false)
on conflict (id) do nothing;

-- Make an account admin (run after that person registers):
-- update auth.users set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'
-- where email = 'ADMIN_EMAIL_HERE';
