# Anargya Corp

Corporate site, parts marketplace, and admin dashboard for **Anargya Corp**, a fictional Japan-based design house for electric formula vehicles (Anargya ITS EV Team internship final project). Installable as a PWA.

Design source: Figma file "Anargya", page **Anargya Corp: Final Project**, sections prefixed **V3** (color roles).

## Accounts and access

Everything the team needs to log in, in one place. **Passwords and secret keys are never written in this repo** (it is on GitHub). They live in `ACCOUNTS.local.md` (gitignored; template below) kept on the team drive, and secret keys only in Vercel → Settings → Environment Variables.

| What | Where | Login / owner | Used for |
|---|---|---|---|
| Code | https://github.com/Notdils/Final-Project-Anargya | GitHub `Notdils` (add members as collaborators) | Source, pull requests |
| Hosting | Vercel project `finalproject-anargya-a` → https://finalproject-anargya-a.vercel.app | Vercel account of the repo owner | Deploys from `main`, env vars |
| Database + auth | Supabase project (region Sydney) | Supabase account of the repo owner | Postgres, Auth, Storage `part-media` |
| Payments | Midtrans **sandbox** dashboard (dashboard.sandbox.midtrans.com) | Midtrans sandbox account | Snap keys, notification URL, test transactions |
| Design | Figma file "Anargya", page "Anargya Corp: Final Project" | Team Figma | UI source of truth |

Site accounts (create them yourself on `/register`, then set the role in **Admin → Users** or with the SQL in *Supabase setup*):

| Email | Role | Can do |
|---|---|---|
| `juri.admin@example.com` | admin | Everything |
| `juri.customer@example.com` | customer | Shop, pay (sandbox), book consulting |
| `ops@example.com` (optional) | ops | Orders, shipping, bookings |
| `finance@example.com` (optional) | finance | Overview, receipts, exports, shipping rates |
| `catalog@example.com` (optional) | catalog | Products |

`example.com` addresses cannot receive mail, so turn **Confirm email** off in Supabase while demoing (see *Demo for judging*).

Environment variables (Vercel, Production; local copy in `.env.local`):

| Variable | Secret? | Where to get it |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | no (public) | Supabase → Project settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | **yes** | Supabase → Project settings → API (service_role). Vercel only |
| `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` | no | Midtrans sandbox → Settings → Access keys |
| `MIDTRANS_SERVER_KEY` | **yes** | Same page. Vercel only |
| `MIDTRANS_IS_PRODUCTION` | no | `false` |
| `FX_USD_IDR`, `NEXT_PUBLIC_FX_USD_JPY` | no | Finance |
| `SHIPPING_FLAT_USD`, `CONSULT_FEE_USD` | no | Finance / team |

`ACCOUNTS.local.md` template (copy, fill in, keep off GitHub):

```md
| Service | Login email | Password / where it is | Notes |
|---|---|---|---|
| GitHub | | | |
| Vercel | | | |
| Supabase | | | DB password: |
| Midtrans sandbox | | | |
| Site: juri.admin@example.com | | | role admin |
| Site: juri.customer@example.com | | | customer |
```

## Stack

- Next.js 15 (App Router) + React 19 + TypeScript
- Tailwind CSS v4 (tokens in `src/app/globals.css`)
- Three.js via React Three Fiber + drei (E21 hero)
- GSAP ScrollTrigger (Z fly-through after the hero)
- Supabase (Postgres, Auth, RLS)
- Midtrans Snap (sandbox) for payment, IDR
- ExcelJS for XLSX export

## Pages

| Route | What |
|---|---|
| `/` | 3D E21 hero, pinned fly-through ("Designing cars?" → "We got you covered."), how we work, values, featured parts coverflow |
| `/about` | Story, mission/vision, business model, capabilities |
| `/marketplace` | Coverflow + filterable grid |
| `/marketplace/[slug]` | Part detail, 3D viewer frame, add to cart |
| `/cart`, `/checkout`, `/receipt/[id]` | Cart, Midtrans checkout, printable receipt |
| `/login`, `/register`, `/forgot-password`, `/reset-password`, `/account` | Auth (server routes with rate limit), password reset, order history |
| `/admin` … | Staff area: Overview, Orders (fulfilment), Receipts (CSV/XLSX), Bookings, Products (prices, stock, media upload), Users (roles). Menu and access depend on the role, see below |
| `/app` | PWA start URL, redirects by role |

## Run locally

```bash
npm install
cp .env.example .env.local   # fill in values, see below
npm run dev
```

Without Supabase env vars the site still renders with the placeholder catalog (admin shows a "demo mode" notice and checkout is disabled).

## Supabase setup

1. Create a new Supabase project.
2. SQL editor: paste all of `supabase/master.sql` and run it once. It holds every migration in order and skips the ones already applied (ledger table `schema_migrations`). The last query should return 0 rows. After adding a migration to `supabase/migrations/`, run `npm run sql:master` and paste the file again; `npm run test:master` checks it on a fresh and an existing database.
3. Auth → URL configuration: set Site URL to the deployed domain and add `https://<domain>/auth/callback` to Redirect URLs (password reset and email confirmation links land there).
4. Register an account on the site, then make it admin (SQL editor):
   ```sql
   update auth.users
   set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'
   where id = 'YOUR_USER_UUID'; -- copy the UUID from Authentication → Users (safer than matching by email)
   ```
   After that, give other people roles from **Admin → Users** (every change is logged in `admin_audit`).
   Log out and in again so the session picks up the role.

Security notes:
- Orders are only created through `create_order()` (prices and stock read inside one transaction with `SELECT ... FOR UPDATE`). Clients cannot insert orders directly.
- Payment status and stock decrement only happen in `mark_order_paid()`, called by the Midtrans webhook after signature check and a second status lookup.
- Login (5 tries / 5 min per email+IP), register, checkout and event ingestion are rate limited in the database (`hit_rate_limit`).
- Role comes from `app_metadata` (users cannot edit it), checked in middleware, server code, and RLS.
- `SUPABASE_SERVICE_ROLE_KEY` is server only. Put it in Vercel env vars, never in the repo.

## Demo for judging

1. Supabase → Authentication → Sign In / Providers → Email: turn **Confirm email** off (the built-in mailer only sends a few emails per hour).
2. Register `juri.admin@example.com` and `juri.customer@example.com` on the site with passwords you choose.
3. SQL editor: run `supabase/demo/demo_seed.sql`. It makes the first account admin and adds labeled demo orders (`[DEMO]`, txn `DEMO-…`), without touching stock or Midtrans.
4. `supabase/demo/demo_cleanup.sql` removes all of it.
5. Test payment (Midtrans sandbox, no real money): card `4811 1111 1111 1114`, any future expiry, CVV `123`, OTP `112233`.

Passwords are shared with the judges outside the repo.

## Midtrans setup

1. Sandbox dashboard → Settings → Access keys: generate a server key with **Snap Checkout: Write**, **Core API: Read**, **Expire transaction: Write**; copy it and the client key into env.
2. Settings → Payment → Notification URL: `https://<domain>/api/midtrans/notify`. The notification only triggers a status lookup; the order is updated from what Midtrans's status API returns. If the amount differs from what we charged, the order is not marked paid and shows as **Needs review** in the admin.
3. Set `FX_USD_IDR` and `NEXT_PUBLIC_FX_USD_JPY` (rates confirmed by Finance). Checkout stays disabled until `FX_USD_IDR` is set.

## PWA / Android (TWA)

- Manifest: `src/app/manifest.ts`, service worker: `public/sw.js`, icons: `public/icons/`.
- Private routes (api, admin, checkout, receipt, account, auth) are never cached.
- For an APK: deploy first, then `npx @bubblewrap/cli init --manifest https://<domain>/manifest.webmanifest`, build in Android Studio, and publish `/.well-known/assetlinks.json` with the keystore SHA-256 (add the file to `public/.well-known/`).

## Placeholders to replace

Everything marked `[PLACEHOLDER]` or `[CITY]`: stock and lead times of the four parts, specs, story, mission/vision, values, business-plan slots, company address, receipt fields (pending Finance), shipping (`SHIPPING_FLAT_USD`), consulting copy, launch poster (Graphic Design), fly-through objects (waiting for the part renders), 3D model of the uprights / wheel hub kit (file pending; the aero card uses front wing + rear wing + diffuser, `0014`), logo next to the wordmark (`src/components/brand-mark.tsx`), footer contacts (`src/lib/contact.ts`), consultation fee (`CONSULT_FEE_USD`).

## Scripts

```bash
npx tsc --noEmit   # type check
npm run lint
npm run build
```

## Roles (RBAC)

The role is stored in `app_metadata.role` (only the server can write it). Access is checked three times: middleware, the page or API route (`src/lib/rbac.ts`), and Postgres RLS (`has_perm()` in `0011`).

| Role | Can use |
|---|---|
| `admin` | Everything, including Users and roles |
| `catalog` | Products: prices, stock, active/featured, render image and 3D model upload |
| `ops` | Orders and fulfilment (carrier, tracking), Bookings |
| `finance` | Overview, Receipts and exports, Orders read-only |
| none | Customer |

Shipping: checkout asks for the destination country (Asia list in `shipping_zones`) and, for Japan, East or West (`JP-EAST`, `JP-WEST`). The order API looks up the zone rate on the server; a zone without a rate uses `SHIPPING_FLAT_USD`. Ops and Finance edit rates, days and on/off in Admin → Shipping (`0013`).

Vouchers were removed on 13 Nov (`0023`): the tables and `voucher_discount()` are dropped; `orders.voucher_code` and `orders.discount_usd` stay so older receipts keep their numbers.

Currency: prices are stored in USD. The header switch shows USD, JPY or IDR (only the ones with a rate set: `NEXT_PUBLIC_FX_USD_JPY`, `FX_USD_IDR`). Midtrans charges IDR only; receipts always show the order's USD amounts and the IDR charged.

To add a role, change `PERMS` in `src/lib/rbac.ts` and `has_perm()` in a new migration together. Product media go to the public Supabase Storage bucket `part-media` (created by `0011`); uploads only go through `/api/admin/products/[id]/media`, which checks the role and the file content (WebP/PNG/JPEG up to 1 MB, binary glTF up to 10 MB).

