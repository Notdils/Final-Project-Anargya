// RBAC checks without a browser or real accounts. Usage: npm run test:rbac
// 1. src/lib/rbac.ts and the SQL has_perm() (latest migration) give the same answer for every role and permission.
// 2. Every admin page and API path needs the permission listed below, per role.
// 3. Every admin API route checks the same permission the middleware checks.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { can, permForPath, homeFor, STAFF_ROLES } from "../src/lib/rbac.ts";

let fail = 0;
const ok = (cond, msg) => { if (!cond) { fail++; console.log("FAIL:", msg); } };
const ROLES = [...STAFF_ROLES, "customer"];
const PERMS = ["overview.read", "receipts.read", "orders.read", "orders.fulfil", "bookings.read", "bookings.manage", "products.read", "products.write", "users.manage", "shipping.manage", "support.reply"];

// ---------- 1. TS vs SQL ----------
const dir = new URL("../supabase/migrations/", import.meta.url);
const sql = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort().map((f) => readFileSync(new URL(f, dir), "utf8")).join("\n");
const fn = (name) => [...sql.matchAll(new RegExp(`create or replace function public\\.${name}\\([\\s\\S]*?\\$\\$;`, "g"))].at(-1)?.[0];
const db = new PGlite();
await db.exec(`create schema auth;
create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('test.jwt', true),''),'{}')::jsonb $$;`);
await db.exec(fn("staff_role")); await db.exec(fn("has_perm"));
for (const role of ROLES) {
  await db.query(`select set_config('test.jwt', $1, false)`, [JSON.stringify(role === "customer" ? {} : { app_metadata: { role } })]);
  for (const p of PERMS) {
    const s = (await db.query(`select public.has_perm($1) as v`, [p])).rows[0].v;
    ok(s === can(role, p), `${role} ${p}: SQL ${s}, TS ${can(role, p)}`);
  }
}
await db.query(`select set_config('test.jwt', $1, false)`, [JSON.stringify({ app_metadata: { role: "superuser" } })]);
ok((await db.query(`select public.has_perm('products.read') as v`)).rows[0].v === false, "unknown role must have no access");

// ---------- 2. path matrix (Y = allowed) ----------
const ID = "11111111-1111-1111-1111-111111111111";
const MATRIX = {
  //                                  admin catalog ops finance customer
  "/admin":                            "Y . . Y .",
  "/admin/orders":                     "Y . Y Y .",
  "/admin/receipts":                   "Y . . Y .",
  "/admin/bookings":                   "Y . Y . .",
  "/admin/products":                   "Y Y Y . .",
  "/admin/shipping":                   "Y . Y Y .",
  "/admin/users":                      "Y . . . .",
  "/admin/inbox":                      "Y Y Y Y .",
  "/api/admin/support":                "Y Y Y Y .",
  [`/api/admin/support/${ID}`]:         "Y Y Y Y .",
  "/api/admin/export":                 "Y . . Y .",
  [`/api/admin/orders/${ID}`]:          "Y . Y . .",
  [`/api/admin/orders/${ID}/midtrans`]: "Y . Y Y .",
  [`/api/admin/bookings/${ID}`]:        "Y . Y . .",
  "/api/admin/products":               "Y Y . . .",
  [`/api/admin/products/${ID}/media`]:  "Y Y . . .",
  "/api/admin/shipping/JP":            "Y . Y Y .",
  [`/api/admin/users/${ID}/role`]:      "Y . . . .",
};
for (const [path, row] of Object.entries(MATRIX)) {
  const need = permForPath(path);
  ok(need, `${path} has no permission mapped`);
  row.split(" ").forEach((v, i) => ok(can(ROLES[i], need) === (v === "Y"), `${ROLES[i]} on ${path} should be ${v === "Y" ? "allowed" : "denied"}`));
}
for (const role of STAFF_ROLES) ok(can(role, permForPath(homeFor(role))), `${role} lands on ${homeFor(role)} but cannot open it`);
ok(homeFor("customer") === "/marketplace", "customer lands on /marketplace");

// ---------- 3. route guards match middleware ----------
const api = new URL("../src/app/api/admin/", import.meta.url);
const routes = readdirSync(api, { recursive: true }).filter((f) => f.endsWith("route.ts"));
for (const f of routes) {
  const src = readFileSync(new URL(f, api), "utf8");
  const used = [...src.matchAll(/(?:guardApi|can\(role,)\s*\(?"([a-z.]+)"/g)].map((m) => m[1]);
  ok(used.length > 0, `${f}: no permission check in the route`);
  const path = "/api/admin/" + f.replace(/\\/g, "/").replace(/\/?route\.ts$/, "").replace(/\[[^\]]+\]/g, (m) => (m === "[code]" ? "JP" : ID));
  for (const p of used) ok(permForPath(path) === p, `${f}: route checks ${p}, middleware checks ${permForPath(path)}`);
}

console.log(fail ? `\n${fail} RBAC check(s) failed` : `RBAC OK: ${ROLES.length} roles x ${PERMS.length} perms match SQL, ${Object.keys(MATRIX).length} paths, ${routes.length} API routes`);
process.exit(fail ? 1 : 0);
