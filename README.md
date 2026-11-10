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
| `/admin`, `/admin/receipts` | KPIs, conversion funnel, receipts table, CSV/XLSX export (admin role only) |
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
2. SQL editor: run `supabase/migrations/0001_schema.sql`, then `0002_seed.sql`.
3. Auth → URL configuration: set Site URL to the deployed domain and add `https://<domain>/auth/callback` to Redirect URLs (password reset and email confirmation links land there).
4. Register an account on the site, then make it admin (SQL editor):
   ```sql
   update auth.users
   set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'
   where email = 'YOUR_EMAIL';
   ```
   Log out and in again so the session picks up the role.

Security notes:
- Orders are only created through `create_order()` (prices and stock read inside one transaction with `SELECT ... FOR UPDATE`). Clients cannot insert orders directly.
- Payment status and stock decrement only happen in `mark_order_paid()`, called by the Midtrans webhook after signature check and a second status lookup.
- Login (5 tries / 5 min per email+IP), register, checkout and event ingestion are rate limited in the database (`hit_rate_limit`).
- Role comes from `app_metadata` (users cannot edit it), checked in middleware, server code, and RLS.
- `SUPABASE_SERVICE_ROLE_KEY` is server only. Put it in Vercel env vars, never in the repo.

## Midtrans setup

1. Sandbox dashboard → Settings → Access keys: copy client key and server key into env.
2. Settings → Payment → Notification URL: `https://<domain>/api/midtrans/notify`.
3. Set `FX_JPY_IDR` (rate confirmed by Finance). Checkout stays disabled until it is set.

## PWA / Android (TWA)

- Manifest: `src/app/manifest.ts`, service worker: `public/sw.js`, icons: `public/icons/`.
- Private routes (api, admin, checkout, receipt, account, auth) are never cached.
- For an APK: deploy first, then `npx @bubblewrap/cli init --manifest https://<domain>/manifest.webmanifest`, build in Android Studio, and publish `/.well-known/assetlinks.json` with the keystore SHA-256 (add the file to `public/.well-known/`).

## Placeholders to replace

Everything marked `[PLACEHOLDER]` or `[CITY]`: product names, prices (all set to ¥10,000 only so checkout can be demoed), stock, specs, story, mission/vision, values, business-plan slots, company address, receipt fields (pending Finance), shipping (`SHIPPING_FLAT_JPY`), fly-through objects (waiting for the part renders), per-part 3D models (`products.model_url`).

## Scripts

```bash
npx tsc --noEmit   # type check
npm run lint
npm run build
```
