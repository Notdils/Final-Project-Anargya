// Checks supabase/master.sql on an in-memory Postgres: (1) fresh database, (2) running it again,
// (3) a database where 0001 to 0014 were applied by hand before the ledger existed.
// Usage: npm run test:master
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";

const stub = `create role anon; create role authenticated; create role service_role; create schema auth;
create table auth.users (id uuid primary key, email text, raw_app_meta_data jsonb default '{}', raw_user_meta_data jsonb default '{}');
create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
create function auth.jwt() returns jsonb language sql stable as $$ select '{}'::jsonb $$;
create schema storage; create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid default gen_random_uuid(), bucket_id text, name text, owner uuid);`;
const noExt = (s) => s.replace(/create extension[^;]+;/gi, "");
const master = noExt(readFileSync(new URL("../supabase/master.sql", import.meta.url), "utf8"));
const migDir = new URL("../supabase/migrations/", import.meta.url);
const total = readdirSync(migDir).filter((f) => /^\d{4}_/.test(f)).length;
const report = async (db, label) => {
  const r = await db.exec(master);
  const missing = r.at(-1).rows.length;
  const done = (await db.query("select count(*)::int n from public.schema_migrations")).rows[0].n;
  console.log(`${label}: OK, ledger ${done}/${total}, missing ${missing}`);
  if (missing || done !== total) process.exitCode = 1;
};

const fresh = new PGlite(); await fresh.exec(stub);
await report(fresh, "fresh database");
await report(fresh, "run again");

const legacy = new PGlite(); await legacy.exec(stub);
for (const f of readdirSync(migDir).filter((f) => f <= "0014_z").sort()) await legacy.exec(noExt(readFileSync(new URL(f, migDir), "utf8")));
await report(legacy, "existing database (0001-0014 by hand)");
await report(legacy, "existing database, run again");
