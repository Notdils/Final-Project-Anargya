// Creates (or refreshes) the demo account for each role in Supabase, with the email, password and
// role from scripts/demo-accounts.mjs (also listed in README.md). Safe to run again.
//
//   PowerShell:  $env:NEXT_PUBLIC_SUPABASE_URL="<url>"; $env:SUPABASE_SERVICE_ROLE_KEY="<key>"
//                node scripts/create-demo-accounts.mjs            (add --remove to delete them)
//
// Both values are in Vercel > Settings > Environment Variables. Set the key only in the terminal session; do not save it to a file.
import { createClient } from "@supabase/supabase-js";
import { DEMO_ACCOUNTS } from "./demo-accounts.mjs";

const ROLES = Object.keys(DEMO_ACCOUNTS);
const emailFor = (r) => DEMO_ACCOUNTS[r].email;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY first."); process.exit(1); }
const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const all = [];
for (let page = 1; ; page++) {
  const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 1000 });
  if (error) { console.error("Could not list users:", error.message); process.exit(1); }
  all.push(...data.users);
  if (data.users.length < 1000) break;
}
const find = (email) => all.find((u) => (u.email ?? "").toLowerCase() === email);

if (process.argv.includes("--remove")) {
  for (const r of ROLES) {
    const u = find(emailFor(r));
    if (!u) continue;
    const { error } = await sb.auth.admin.deleteUser(u.id);
    console.log(error ? `${emailFor(r)}: ${error.message}` : `${emailFor(r)}: removed`);
  }
  process.exit(0);
}

for (const r of ROLES) {
  const email = emailFor(r);
  const { password } = DEMO_ACCOUNTS[r];
  const attrs = { password, email_confirm: true, app_metadata: { role: r === "customer" ? null : r }, user_metadata: { full_name: `Demo ${r}` } };
  const existing = find(email);
  const { error } = existing
    ? await sb.auth.admin.updateUserById(existing.id, attrs)
    : await sb.auth.admin.createUser({ email, ...attrs });
  if (error) { console.error(`${email}: ${error.message}`); process.exit(1); }
  console.log(`${email}: ${existing ? "updated" : "created"} (role ${r})`);
}
console.log("\nDone. Log in with the accounts in README.md, or run: node scripts/rbac-check.mjs");
