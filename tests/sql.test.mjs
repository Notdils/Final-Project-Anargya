// Runs the Supabase migrations on an in-memory Postgres (PGlite) with a stubbed auth schema
// and checks the order, payment, rate-limit and admin logic. Usage: npm run test:sql
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
const db = new PGlite();
const run = (q, p) => db.query(q, p);
await db.exec(`
create role anon; create role authenticated;
create schema auth;
create table auth.users (id uuid primary key, email text, raw_app_meta_data jsonb default '{}');
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true),'')::uuid $$;
create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('test.jwt', true),''),'{}')::jsonb $$;
`);
const strip = (s) => s.replace(/create extension[^;]+;/i, "");
await db.exec(strip(readFileSync(new URL("../supabase/migrations/0001_schema.sql", import.meta.url),"utf8")));
await db.exec(readFileSync(new URL("../supabase/migrations/0002_seed.sql", import.meta.url),"utf8"));
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
