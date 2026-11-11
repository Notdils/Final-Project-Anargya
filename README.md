# Anargya Corp

Corporate site, parts marketplace, and admin dashboard for **Anargya Corp**, a fictional Japan-based design house for electric formula vehicles (Anargya ITS EV Team internship final project). Installable as a PWA.

Design source: Figma file "Anargya", page **Anargya Corp: Final Project**, sections prefixed **V3** (color roles).

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
2. SQL editor: run the files in `supabase/migrations/` in order (`0001` to `0011`).
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
3. SQL editor: run `supabase/demo/demo_seed.sql`. It makes the first account admin and adds labeled demo orders (`[DEMO]`, txn `DEMO-…`) and funnel traffic, without touching stock or Midtrans.
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

Everything marked `[PLACEHOLDER]` or `[CITY]`: stock and lead times of the four parts, specs, story, mission/vision, values, business-plan slots, company address, receipt fields (pending Finance), shipping (`SHIPPING_FLAT_USD`), consulting copy, launch poster (Graphic Design), fly-through objects (waiting for the part renders), per-part 3D models (`products.model_url`; the current mapping in `0007` is a preview: diffuser on the uprights card, rear wing on the pedal box card), consultation fee (`CONSULT_FEE_USD`).

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

To add a role, change `PERMS` in `src/lib/rbac.ts` and `has_perm()` in a new migration together. Product media go to the public Supabase Storage bucket `part-media` (created by `0011`); uploads only go through `/api/admin/products/[id]/media`, which checks the role and the file content (WebP/PNG/JPEG up to 1 MB, binary glTF up to 10 MB).

