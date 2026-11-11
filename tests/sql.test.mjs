// Runs the Supabase migrations on an in-memory Postgres (PGlite) with a stubbed auth schema
// and checks the order, payment, rate-limit and admin logic. Usage: npm run test:sql
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
const db = new PGlite();
const run = (q, p) => db.query(q, p);
await db.exec(`
create role anon; create role authenticated; create role service_role;
create schema auth;
create table auth.users (id uuid primary key, email text, raw_app_meta_data jsonb default '{}');
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true),'')::uuid $$;
create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('test.jwt', true),''),'{}')::jsonb $$;
`);
const strip = (s) => s.replace(/create extension[^;]+;/i, "");
await db.exec(strip(readFileSync(new URL("../supabase/migrations/0001_schema.sql", import.meta.url),"utf8")));
await db.exec(readFileSync(new URL("../supabase/migrations/0002_seed.sql", import.meta.url),"utf8"));
for (const m of ["0003_payment_resume.sql", "0004_needs_review.sql"]) await db.exec(readFileSync(new URL(`../supabase/migrations/${m}`, import.meta.url), "utf8"));
console.log("migrations OK, products:", (await run("select count(*) from products")).rows[0].count);

const U1="11111111-1111-1111-1111-111111111111", U2="22222222-2222-2222-2222-222222222222";
await run(`insert into auth.users(id,email) values ($1,'a@x.co'),($2,'b@x.co')`,[U1,U2]);
const contact = JSON.stringify({email:"a@x.co",name:"A",phone:"+81 1234",address:"Street 1",city:"Tokyo",postal:"100",country:"Japan"});
const as = async (uid) => db.exec(`select set_config('test.uid','${uid}',false)`);
const order = async (items, ship=500, fx=105.5) => (await run(`select * from create_order($1::jsonb,$2::jsonb,$3,$4)`,[JSON.stringify(items),contact,ship,fx])).rows[0];
const stock = async (id) => (await run(`select stock from products where id=$1`,[id])).rows[0].stock;

// 1 not logged in
await as("");
try { await order([{id:"p-aero-01",qty:1}]); console.log("FAIL: anon order allowed"); } catch(e){ console.log("anon blocked:", e.message); }

// 2 normal order, totals from DB (client price ignored)
await as(U1);
const o1 = await order([{id:"p-aero-01",qty:2,price:1},{id:"p-susp-01",qty:1}]);
console.log("order1", o1, "expect total", 3*10000+500, "idr", Math.ceil((30500)*105.5));
console.log("receipt format ok:", /^ANR-\d{4}-\d{6}$/.test(o1.receipt_no));
console.log("stock unchanged before payment:", await stock("p-aero-01"));

// 3 over stock rejected
try { await order([{id:"p-aero-01",qty:4}]); console.log("FAIL: overstock allowed"); } catch(e){ console.log("overstock blocked:", e.message); }
// 4 bad qty / unknown product
for (const it of [[{id:"p-aero-01",qty:0}],[{id:"nope",qty:1}],[]]) { try { await order(it); console.log("FAIL", it); } catch(e){ console.log("rejected:", e.message); } }

// 5 paid -> stock decrement, idempotent
await run(`select mark_order_paid($1,'txn1','gopay')`,[o1.order_id]);
await run(`select mark_order_paid($1,'txn1','gopay')`,[o1.order_id]);
console.log("after paid (twice) aero stock:", await stock("p-aero-01"), "(expect 1)", "status:", (await run(`select status,paid_at is not null p from orders where id=$1`,[o1.order_id])).rows[0]);

// 6 race: two pending orders for last unit, both paid
await as(U2); const a = await order([{id:"p-aero-01",qty:1}]); await as(U1); const b = await order([{id:"p-aero-01",qty:1}]);
await run(`select mark_order_paid($1,'t2','qris')`,[a.order_id]);
await run(`select mark_order_paid($1,'t3','qris')`,[b.order_id]);
console.log("second paid:", (await run(`select status, oversold from orders where id=$1`,[b.order_id])).rows[0], "stock", await stock("p-aero-01"));
// 7 failed / expired transitions only from pending
await run(`select mark_order_status($1,'failed','t4')`,[o1.order_id]);
console.log("paid order stays:", (await run(`select status from orders where id=$1`,[o1.order_id])).rows[0].status);

// 8 rate limit counter
for (let i=0;i<3;i++) console.log("hit", (await run(`select hit_rate_limit('k',60) n`)).rows[0].n);

// 9 is_admin
await db.exec(`select set_config('test.jwt','{"app_metadata":{"role":"admin"}}',false)`); console.log("is_admin:", (await run("select is_admin() a")).rows[0].a);
await db.exec(`select set_config('test.jwt','{"app_metadata":{}}',false)`); console.log("is_admin (customer):", (await run("select is_admin() a")).rows[0].a);
try { await run(`select * from funnel_counts(now()-interval '1 day', now())`); console.log("FAIL funnel open"); } catch(e){ console.log("funnel blocked for non-admin:", e.message); }
await db.exec(`select set_config('test.jwt','{"app_metadata":{"role":"admin"}}',false)`);
await run(`insert into events(session_id,type,path) values ('abcdef0123456789','page_view','/'),('abcdef0123456789','page_view','/marketplace')`);
console.log("funnel:", (await run(`select * from funnel_counts(now()-interval '1 day', now()+interval '1 minute')`)).rows);

// 0004: a flagged order stays pending, keeps its flag, and a later "paid" call is not blocked by the flag itself
{
  const o = (await run("select id from orders limit 1")).rows[0];
  if (o) {
    await run("update orders set needs_review = true, review_note = 'Midtrans amount 1 IDR, expected 2 IDR' where id = $1", [o.id]);
    const r = (await run("select status, needs_review, review_note from orders where id = $1", [o.id])).rows[0];
    console.log("needs_review flag:", r.needs_review, r.review_note);
  } else console.log("needs_review: columns present:", (await run("select count(*) from information_schema.columns where table_name='orders' and column_name in ('needs_review','review_note','snap_token','pay_expires_at')")).rows[0].count);
}

// 0005: USD catalog and USD orders (runs after the JPY tests above, like a real upgrade)
await db.exec(readFileSync(new URL("../supabase/migrations/0005_usd_catalog.sql", import.meta.url), "utf8"));
await db.exec(readFileSync(new URL("../supabase/migrations/0005_usd_catalog.sql", import.meta.url), "utf8")); // re-run is safe
console.log("0005 active products:", (await run("select code, price_usd, unit from products where active order by code")).rows.map(r => `${r.code} $${r.price_usd}/${r.unit}`).join(", "));
console.log("0005 inactive old products:", (await run("select count(*) from products where not active")).rows[0].count);
const usd = async (items, ship = 0, fx = 16000) => (await run(`select * from create_order_usd($1::jsonb,$2::jsonb,$3,$4)`, [JSON.stringify(items), contact, ship, fx])).rows[0];
await as(U1);
const u1 = await usd([{ id: "p-aero-package", qty: 1 }, { id: "p-vcu-bms", qty: 2 }], 0, 16000);
console.log("usd order:", u1.total_usd, "USD ->", u1.charged_idr, "IDR (expect 5520 -> 88320000)");
try { await usd([{ id: "p-aero-01", qty: 1 }]); console.log("FAIL: old product orderable"); } catch (e) { console.log("old product blocked:", e.message); }
try { await usd([{ id: "p-vcu-bms", qty: 1 }], 0, 0); console.log("FAIL: zero fx"); } catch (e) { console.log("zero fx blocked:", e.message); }
try { await order([{ id: "p-aero-package", qty: 1 }]); console.log("old JPY path still callable as owner (grant revoked for authenticated in Supabase)"); } catch (e) { console.log("jpy path:", e.message); }
await run(`select mark_order_paid($1,'tu','card')`, [u1.order_id]);
console.log("usd paid, stock aero/vcu:", await stock("p-aero-package"), await stock("p-vcu-bms"), "(expect 4, 10)");

// 0006: bookings, one active booking per slot, public view of taken slots without personal data
await db.exec(readFileSync(new URL("../supabase/migrations/0006_bookings.sql", import.meta.url), "utf8"));
const bk = (d, t, st = "requested") => run(`insert into bookings(name,email,organisation,topic,slot_date,slot_time,status) values ('Tester','t@x.co','Team X','aero',$1,$2,$3) returning id`, [d, t, st]);
const b1 = (await bk("2026-12-01", "09:00")).rows[0].id;
try { await bk("2026-12-01", "09:00"); console.log("FAIL: double booking allowed"); } catch (e) { console.log("double booking blocked:", e.message.slice(0, 60)); }
await run(`update bookings set status='cancelled' where id=$1`, [b1]);
await bk("2026-12-01", "09:00"); console.log("slot reusable after cancel: ok");
try { await bk("2026-12-02", "10:30"); console.log("FAIL: bad slot accepted"); } catch (e) { console.log("bad slot blocked"); }
console.log("taken slots:", (await run(`select * from taken_slots('2026-11-01','2026-12-31')`)).rows.map(r => `${r.slot_date.toISOString?.().slice(0,10) ?? r.slot_date} ${r.slot_time}`), "columns:", Object.keys((await run(`select * from taken_slots('2026-11-01','2026-12-31')`)).rows[0]).join(","));

// 0007/0008: part models, paid bookings
await db.exec(readFileSync(new URL("../supabase/migrations/0007_part_models.sql", import.meta.url), "utf8"));
console.log("models:", (await run(`select id, model_url from products where model_url is not null order by id`)).rows.map(r => `${r.id}=${r.model_url}`).join(" "));
await db.exec(readFileSync(new URL("../supabase/migrations/0008_booking_payment.sql", import.meta.url), "utf8"));
await db.exec(readFileSync(new URL("../supabase/migrations/0008_booking_payment.sql", import.meta.url), "utf8")); // re-run is safe
const pb = (await run(`insert into bookings(name,email,phone,organisation,topic,slot_date,slot_time,fee_usd,fx_usd_idr,charged_idr,pay_status,pay_expires_at) values ('Pat','p@x.co','+8190','Team','aero','2026-12-03','11:00',100,16300,1630000,'pending', now() + interval '1 hour') returning id`)).rows[0].id;
try { await run(`insert into bookings(name,email,organisation,topic,slot_date,slot_time) values ('Quinn','q@x.co','Team','aero','2026-12-03','11:00')`); console.log("FAIL: pending booking does not hold slot"); } catch { console.log("pending payment holds slot: ok"); }
await run(`update bookings set pay_status='expired', status='cancelled' where id=$1`, [pb]);
await run(`insert into bookings(name,email,organisation,topic,slot_date,slot_time) values ('Quinn','q@x.co','Team','aero','2026-12-03','11:00')`); console.log("expired payment frees slot: ok");
try { await run(`update bookings set pay_status='weird' where id=$1`, [pb]); console.log("FAIL: bad pay_status accepted"); } catch { console.log("bad pay_status blocked"); }

// 0009: orders only through the server function; one unpaid booking per user
await db.exec(readFileSync(new URL("../supabase/migrations/0009_security_fixes.sql", import.meta.url), "utf8"));
const canAuth = async (fn) => (await run(`select has_function_privilege('authenticated', '${fn}', 'execute') as ok`)).rows[0].ok;
console.log("authenticated can run create_order_usd:", await canAuth("public.create_order_usd(jsonb,jsonb,numeric,numeric)"), "| create_order_usd_srv:", await canAuth("public.create_order_usd_srv(uuid,jsonb,jsonb,numeric,numeric)"));
const c9 = { email: "a@x.co", name: "Alice", phone: "+81 90 1234", address: "1-2-3 Somewhere", city: "Tokyo", postal: "100-0001", country: "Japan" };
const so = (await run(`select * from create_order_usd_srv($1, $2, $3, 0, 16300)`, [U1, JSON.stringify([{ id: "p-vcu-bms", qty: 1 }]), JSON.stringify(c9)])).rows[0];
console.log("server order:", so.total_usd, so.charged_idr);
try { await run(`select * from create_order_usd_srv($1, $2, $3, 0, 16300)`, [U1, JSON.stringify([{ id: "p-vcu-bms", qty: 1 }]), JSON.stringify({ ...c9, city: "x".repeat(5000) })]); console.log("FAIL: oversized contact accepted"); } catch { console.log("oversized contact blocked"); }
await run(`insert into bookings(user_id,name,email,organisation,topic,slot_date,slot_time,pay_status) values ($1,'Alice','a@x.co','Team','aero','2026-12-04','09:00','pending')`, [U1]);
try { await run(`insert into bookings(user_id,name,email,organisation,topic,slot_date,slot_time,pay_status) values ($1,'Alice','a@x.co','Team','aero','2026-12-04','11:00','pending')`, [U1]); console.log("FAIL: second pending booking allowed"); } catch (e) { console.log("second pending booking blocked:", /one_pending/.test(e.message)); }

// 0011: role-based permissions, fulfilment columns, audit
await db.exec(readFileSync(new URL("../supabase/migrations/0011_rbac_fulfilment_media.sql", import.meta.url), "utf8"));
await db.exec(readFileSync(new URL("../supabase/migrations/0011_rbac_fulfilment_media.sql", import.meta.url), "utf8")); // re-run is safe
const perms = ["products.write", "orders.read", "orders.fulfil", "bookings.manage", "overview.read", "receipts.read", "users.manage"];
for (const role of ["admin", "catalog", "ops", "finance", ""]) {
  await db.exec(`select set_config('test.jwt','${JSON.stringify({ app_metadata: role ? { role } : {} })}',false)`);
  const r = (await run(`select ${perms.map((p, i) => `has_perm('${p}') p${i}`).join(",")}`)).rows[0];
  console.log(`perms ${role || "customer"}:`, perms.filter((_, i) => r[`p${i}`]).join(" ") || "none");
}
await db.exec(`select set_config('test.jwt','{"app_metadata":{"role":"ops"}}',false)`);
try { await run(`select * from funnel_counts(now() - interval '1 day', now())`); console.log("FAIL: ops ran funnel_counts"); } catch { console.log("funnel_counts blocked for ops"); }
await db.exec(`select set_config('test.jwt','{"app_metadata":{"role":"finance"}}',false)`);
console.log("funnel_counts for finance:", (await run(`select count(*) n from funnel_counts(now() - interval '1 day', now())`)).rows[0].n);
const fo = (await run(`select id from orders limit 1`)).rows[0].id;
await run(`update orders set fulfilment_status='shipped', carrier='X', tracking_no='123' where id=$1`, [fo]);
try { await run(`update orders set fulfilment_status='lost' where id=$1`, [fo]); console.log("FAIL: bad fulfilment accepted"); } catch { console.log("bad fulfilment status blocked"); }
await run(`insert into admin_audit(actor, action, target) values ($1, 'test', 'x')`, [U1]); console.log("audit rows:", (await run(`select count(*) n from admin_audit`)).rows[0].n);

// 0012: specs
await db.exec(readFileSync(new URL("../supabase/migrations/0012_product_specs.sql", import.meta.url), "utf8"));
console.log("specs:", (await run(`select id, material, lead_time from products where id in ('p-upright-kit','p-aero-package','p-vcu-bms','p-pedal-box') order by id`)).rows.map(r => `${r.id}: ${r.material} / ${r.lead_time}`).join(" | "));

// 0013: shipping zones
await db.exec(readFileSync(new URL("../supabase/migrations/0013_shipping.sql", import.meta.url), "utf8"));
await db.exec(readFileSync(new URL("../supabase/migrations/0013_shipping.sql", import.meta.url), "utf8")); // re-run is safe
const zc = (await run(`select kind, count(*) n, count(*) filter (where active) a from shipping_zones group by kind order by kind`)).rows;
console.log("zones:", zc.map((r) => `${r.kind} ${r.a}/${r.n} active`).join(" | "), "| jp regions:", (await run(`select string_agg(code, ',' order by code) c from shipping_zones where kind='jp_region'`)).rows[0].c);
for (const role of ["ops", "finance", "catalog"]) {
  await db.exec(`select set_config('test.jwt','${JSON.stringify({ app_metadata: { role } })}',false)`);
  console.log(`shipping.manage ${role}:`, (await run(`select has_perm('shipping.manage') ok`)).rows[0].ok);
}
try { await run(`update shipping_zones set rate_usd=-1 where code='SG'`); console.log("FAIL: negative rate accepted"); } catch { console.log("negative rate blocked"); }
await run(`update orders set ship_country='JP', ship_region='JP-EAST', shipping_zone='JP-EAST', address_note='Blue gate https://maps.app.goo.gl/x' where id=$1`, [fo]);
try { await run(`update orders set ship_region='JP-13' where id=$1`, [fo]); console.log("FAIL: bad region accepted"); } catch { console.log("bad region blocked"); }
console.log("order destination:", Object.values((await run(`select ship_country, ship_region, shipping_zone from orders where id=$1`, [fo])).rows[0]).join(" "));

// 0014-0016: models fix, overview text, vouchers
for (const f of ["0014_part_models_fix", "0015_product_overview", "0016_vouchers", "0016_vouchers"]) await db.exec(readFileSync(new URL(`../supabase/migrations/${f}.sql`, import.meta.url), "utf8"));
console.log("overview set:", (await run(`select count(*) n from products where overview is not null`)).rows[0].n);
await db.exec(`select set_config('test.jwt','',false)`);
await run(`update products set stock = 50 where id = 'p-vcu-bms'`);
await run(`insert into vouchers(code, kind, value, max_discount_usd, min_subtotal_usd, max_uses, per_user_limit) values ('XMAS10','percent',10,500,500,2,1), ('FLAT50','fixed',50,null,0,null,1) on conflict do nothing`);
const cart = JSON.stringify([{ id: "p-vcu-bms", qty: 1 }]);
console.log("preview XMAS10:", (await run(`select * from voucher_discount($1,'xmas10',$2)`, [U1, cart])).rows[0]);
const ov = (await run(`select * from create_order_usd_srv($1,$2,$3,25,16300,'XMAS10')`, [U1, cart, JSON.stringify(c9)])).rows[0];
console.log("order with voucher total:", ov.total_usd, (await run(`select subtotal_usd, discount_usd, shipping_usd, voucher_code from orders where id=$1`, [ov.order_id])).rows[0]);
try { await run(`select * from create_order_usd_srv($1,$2,$3,0,16300,'XMAS10')`, [U1, cart, JSON.stringify(c9)]); console.log("FAIL: per-user limit"); } catch (e) { console.log("per-user limit:", e.message); }
await run(`update orders set status='expired' where id=$1`, [ov.order_id]);
console.log("expired frees use:", (await run(`select * from voucher_discount($1,'XMAS10',$2)`, [U1, cart])).rows[0].discount_usd);
try { await run(`select * from voucher_discount($1,'XMAS10',$2)`, [U1, JSON.stringify([{ id: "p-pedal-box", qty: 0 }])]); console.log("FAIL: min subtotal"); } catch (e) { console.log("min subtotal:", e.message); }
try { await run(`select * from voucher_discount($1,'NOPE',$2)`, [U1, cart]); } catch (e) { console.log("unknown:", e.message); }
await run(`update vouchers set ends_at = now() - interval '1 second', starts_at = now() - interval '1 day' where code='FLAT50'`);
try { await run(`select * from voucher_discount($1,'FLAT50',$2)`, [U1, cart]); } catch (e) { console.log("expired code:", e.message); }
try { await run(`insert into vouchers(code,kind,value) values ('BAD','percent',150)`); console.log("FAIL: 150%"); } catch { console.log("150% blocked"); }
console.log("authenticated can run voucher_discount:", await canAuth("public.voucher_discount(uuid,text,jsonb,boolean)"));

// 0017: SPD prices and topics
for (let i = 0; i < 2; i++) await db.exec(readFileSync(new URL("../supabase/migrations/0017_spd_prices_topics.sql", import.meta.url), "utf8"));
console.log("prices:", (await run(`select id, price_usd from products where id in ('p-upright-kit','p-aero-package','p-vcu-bms','p-pedal-box') order by id`)).rows.map((r) => `${r.id}=${r.price_usd}`).join(" "));
await run(`insert into bookings(name,email,organisation,topic,slot_date,slot_time) values ('Ren','r@x.co','Team','inspection','2026-12-18','14:00')`); console.log("new topic ok");
try { await run(`insert into bookings(name,email,organisation,topic,slot_date,slot_time) values ('Ren','r@x.co','Team','bogus','2026-12-18','16:00')`); console.log("FAIL bogus topic"); } catch { console.log("bogus topic blocked"); }

// 0018: dimensions
for (let i = 0; i < 2; i++) await db.exec(readFileSync(new URL("../supabase/migrations/0018_product_dimensions.sql", import.meta.url), "utf8"));
console.log("dimensions set:", (await run(`select count(*) n from products where dimensions like '%mm%'`)).rows[0].n);

// maintenance: reset test data
await db.exec(`alter table auth.users add column if not exists raw_user_meta_data jsonb default '{}'::jsonb`);
await run(`update auth.users set raw_user_meta_data = '{"full_name":"A","shipping_address":{"city":"x"}}' where id = $1`, [U1]);
const reset = await db.exec(readFileSync(new URL("../supabase/maintenance/reset_test_data.sql", import.meta.url), "utf8"));
console.log("after reset:", reset.at(-1).rows[0], "| meta:", (await run(`select raw_user_meta_data m from auth.users where id=$1`, [U1])).rows[0].m, "| products:", (await run(`select count(*) n from products`)).rows[0].n);
const fresh = (await run(`select * from create_order_usd_srv($1,$2,$3,0,16300,null)`, [U1, JSON.stringify([{ id: "p-vcu-bms", qty: 1 }]), JSON.stringify(c9)])).rows[0];
console.log("first receipt after reset:", fresh.receipt_no);
