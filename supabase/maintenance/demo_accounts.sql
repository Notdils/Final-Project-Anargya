-- Demo login for each role (same list as README.md and scripts/demo-accounts.mjs).
-- Paste into the Supabase SQL editor and run. Safe to run again: existing demo users get their
-- password, role and confirmed email reset. PUBLIC credentials: demo data only.
-- To remove them: delete from auth.users where email like 'demo.%@anargya.test';
do $demo$
declare
  a record;
  uid uuid;
begin
  for a in select * from (values
    ('demo.admin@anargya.test', 'Anargya-a8Rn8Xl3Lq', 'admin', 'Demo admin'),
    ('demo.catalog@anargya.test', 'Anargya-uPr8bEVIoM', 'catalog', 'Demo catalog'),
    ('demo.ops@anargya.test', 'Anargya-tbLaxmr08g', 'ops', 'Demo ops'),
    ('demo.finance@anargya.test', 'Anargya-SOrcYemcE5', 'finance', 'Demo finance'),
    ('demo.customer@anargya.test', 'Anargya-KAFnldKvMd', null, 'Demo customer')
  ) as t(email, pw, role, full_name)
  loop
    select id into uid from auth.users where email = a.email;
    if uid is null then
      uid := gen_random_uuid();
      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
        confirmation_token, recovery_token, email_change_token_new, email_change
      ) values (
        '00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated', a.email,
        extensions.crypt(a.pw, extensions.gen_salt('bf')), now(),
        jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email'), 'role', a.role),
        jsonb_build_object('full_name', a.full_name), now(), now(),
        '', '', '', ''
      );
      insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
      values (gen_random_uuid(), uid, uid::text, 'email',
        jsonb_build_object('sub', uid::text, 'email', a.email, 'email_verified', true),
        now(), now(), now());
    else
      update auth.users set
        encrypted_password = extensions.crypt(a.pw, extensions.gen_salt('bf')),
        email_confirmed_at = coalesce(email_confirmed_at, now()),
        raw_app_meta_data = jsonb_strip_nulls(coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', a.role)),
        updated_at = now()
      where id = uid;
    end if;
  end loop;
end $demo$;

-- Check: 5 rows, role empty only for the customer
select email, raw_app_meta_data ->> 'role' as role, email_confirmed_at is not null as confirmed
from auth.users where email like 'demo.%@anargya.test' order by email;
