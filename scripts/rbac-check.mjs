// Logs in as each demo account (scripts/demo-accounts.mjs) and checks every admin page and API against the expected matrix.
// Requests are harmless: APIs get a bad id or empty body, so an allowed role gets 400/409 and a denied
// role gets 403 before anything runs. Nothing is changed.
//
//   node scripts/rbac-check.mjs [base-url]     (default: https://finalproject-anargya-a.vercel.app)
import { DEMO_ACCOUNTS as acc } from "./demo-accounts.mjs";

const BASE = (process.argv[2] ?? "https://finalproject-anargya-a.vercel.app").replace(/\/$/, "");
const ROLES = ["admin", "catalog", "ops", "finance", "customer"];

//               [method, path, body, admin catalog ops finance customer]
const CHECKS = [
  ["GET", "/admin", null, "Y . . Y ."],
  ["GET", "/admin/orders", null, "Y . Y Y ."],
  ["GET", "/admin/receipts", null, "Y . . Y ."],
  ["GET", "/admin/bookings", null, "Y . Y . ."],
  ["GET", "/admin/products", null, "Y Y Y . ."],
  ["GET", "/admin/shipping", null, "Y . Y Y ."],
  ["GET", "/admin/users", null, "Y . . . ."],
  ["GET", "/admin/inbox", null, "Y Y Y Y ."],
  ["GET", "/api/admin/support/bad", null, "Y Y Y Y ."],
  ["GET", "/api/admin/export", null, "Y . . Y ."],
  ["PATCH", "/api/admin/orders/bad", {}, "Y . Y . ."],
  ["POST", "/api/admin/orders/bad/midtrans", null, "Y . Y Y ."],
  ["POST", "/api/admin/bookings/bad", {}, "Y . Y . ."],
  ["POST", "/api/admin/products", {}, "Y Y . . ."],
  ["PATCH", "/api/admin/products/BAD!", {}, "Y Y . . ."],
  ["POST", "/api/admin/products/BAD!/media", null, "Y Y . . ."],
  ["PATCH", "/api/admin/shipping/bad", {}, "Y . Y Y ."],
  ["POST", "/api/admin/users/bad/role", {}, "Y . . . ."],
  ["POST", "/api/admin/users/bad/reset", null, "Y . . . ."],
];

async function login(email, password) {
  const r = await fetch(`${BASE}/api/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password }) });
  if (!r.ok) throw new Error(`login ${email}: ${r.status} ${(await r.json().catch(() => ({}))).error ?? ""}`);
  const pairs = r.headers.getSetCookie().map((c) => c.split(";")[0]);
  // user id from the Supabase session cookie (sb-<ref>-auth-token, possibly split into .0, .1, ...)
  const parts = pairs.filter((p) => /^sb-.+-auth-token(\.\d+)?=/.test(p)).sort((a, b) => a.localeCompare(b, "en", { numeric: true })).map((p) => p.slice(p.indexOf("=") + 1));
  let id = null;
  try { const v = decodeURIComponent(parts.join("")); id = JSON.parse(v.startsWith("base64-") ? Buffer.from(v.slice(7), "base64").toString() : v).user?.id ?? null; } catch {}
  return { cookie: pairs.join("; "), id };
}

let fail = 0;
const line = (role, ok, what, got) => { if (!ok) fail++; console.log(`${ok ? "ok  " : "FAIL"} ${role.padEnd(8)} ${what.padEnd(44)} ${got}`); };

for (const [i, role] of ROLES.entries()) {
  const { email, password } = acc[role];
  const { cookie, id } = await login(email, password);
  for (const [method, path, body, row] of CHECKS) {
    const want = row.split(" ")[i] === "Y";
    const r = await fetch(BASE + path, { method, redirect: "manual", headers: { cookie, ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });
    let allowed;
    if (path.startsWith("/api/")) allowed = r.status !== 401 && r.status !== 403;
    else allowed = r.status === 200;
    const got = r.status >= 300 && r.status < 400 ? `${r.status} -> ${new URL(r.headers.get("location"), BASE).pathname}` : String(r.status);
    line(role, allowed === want, `${method} ${path} (${want ? "allow" : "deny"})`, got);
  }
  if (role === "admin" && id) {
    // admins cannot change their own role (prevents locking the last admin out)
    const r = await fetch(`${BASE}/api/admin/users/${id}/role`, { method: "POST", headers: { cookie, "content-type": "application/json" }, body: JSON.stringify({ role: "customer", confirmEmail: email }) });
    line(role, r.status === 409, "POST own role -> customer (blocked)", String(r.status));
  }
}
console.log(fail ? `\n${fail} check(s) failed` : `\nAll ${ROLES.length * CHECKS.length + 1} checks passed`);
process.exit(fail ? 1 : 0);
