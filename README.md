# Anargya Corp

Corporate site, parts marketplace, consultation booking and admin dashboard for **Anargya Corp**, a fictional Japan-based design house for electric formula vehicles (Anargya ITS EV Team internship final project). English and Japanese.

Live: https://finalproject-anargya-a.vercel.app

## Demo accounts

One login per role, stored in Supabase Auth. **These are public** (this repo is public), so anyone can sign in with them; use demo data only.

| Role | Email | Password | Lands on |
|---|---|---|---|
| Admin | `demo.admin@anargya.test` | `Anargya-a8Rn8Xl3Lq` | /admin |
| Catalog | `demo.catalog@anargya.test` | `Anargya-uPr8bEVIoM` | /admin/products |
| Operations | `demo.ops@anargya.test` | `Anargya-tbLaxmr08g` | /admin/orders |
| Finance | `demo.finance@anargya.test` | `Anargya-SOrcYemcE5` | /admin |
| Customer | `demo.customer@anargya.test` | `Anargya-KAFnldKvMd` | /marketplace |

Test payment (Midtrans sandbox, no real money): card `4811 1111 1111 1114`, any future expiry, CVV `123`, OTP `112233`.

## Stack

- Next.js 15 (App Router), React 19, TypeScript
- Tailwind CSS v4 (tokens in `src/app/globals.css`)
- Three.js via React Three Fiber + drei (3D car hero, part viewer)
- GSAP ScrollTrigger (parallax fly-through)
- Supabase (Postgres, Auth, RLS, Storage)
- Midtrans Snap (sandbox), charged in IDR
- ExcelJS (XLSX export)
- Vercel (hosting)

## Pages

Every public page also exists in Japanese under `/ja`.

| Route | What |
|---|---|
| `/` | 3D car hero, parallax fly-through, featured parts |
| `/about` | Story, mission and vision, five-year plan |
| `/marketplace` | Featured parts, filterable grid, business model, capabilities |
| `/marketplace/[slug]` | Part detail, 3D viewer, add to cart |
| `/consulting`, `/consulting/booking/[id]` | Book and pay for a 90-minute consultation, booking status |
| `/cart`, `/checkout`, `/receipt/[id]` | Cart, Midtrans checkout, printable receipt |
| `/login`, `/register`, `/forgot-password`, `/reset-password`, `/account` | Auth, password reset, order history |
| `/admin` … | Overview, Orders, Receipts, Bookings, Products, Shipping (DHL rates per region and part), Users. Menu depends on the role (see Roles) |

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Without the Supabase variables the site still renders with the placeholder catalog; admin shows a demo-mode notice and checkout is disabled.

### Environment variables

Set them in `.env.local` locally and in Vercel → Settings → Environment Variables for deploys.

| Variable | Secret | Where to get it |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | no | Supabase → Project settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | **yes** | Same page (service_role). Vercel only, never in the repo |
| `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` | no | Midtrans sandbox → Settings → Access keys |
| `MIDTRANS_SERVER_KEY` | **yes** | Same page. Vercel only |
| `MIDTRANS_IS_PRODUCTION` | no | `false` |
| `FX_USD_IDR` | no | USD → IDR rate used to charge. Checkout is disabled until it is set |
| `NEXT_PUBLIC_FX_USD_JPY` | no | USD → JPY rate for the yen display |
| `SHIPPING_FLAT_USD` | no | Fallback shipping for a part that has no DHL rate yet (`0` = included) |
| `CONSULT_FEE_USD` | no | Price of one consultation |

### Database

Supabase → SQL editor: paste all of `supabase/master.sql` and run it. It holds every migration in order and skips the ones already applied, so it is safe to run again. The last query should return 0 rows.

## Deploy

1. **Vercel**: import the repo, add the environment variables above, deploy from `main`.
2. **Supabase Auth** → URL configuration: Site URL = the deployed domain; add `https://<domain>/auth/callback` to Redirect URLs (password reset and email confirmation land there).
3. **Midtrans sandbox** → Settings → Payment → Notification URL: `https://<domain>/api/midtrans/notify`.

## Roles (RBAC)

| Role | Can use |
|---|---|
| `admin` | Everything, including Users and roles |
| `catalog` | Products: prices, stock, active/featured, image and 3D model upload |
| `ops` | Orders and fulfilment, Bookings, Shipping, Products read-only |
| `finance` | Overview, Receipts and exports, Shipping, Orders read-only (plus "Check Midtrans" on pending orders) |
| none | Customer |

- The role is stored in `app_metadata.role` and checked in middleware, in the page or API route (`src/lib/rbac.ts`), and in Postgres RLS (`has_perm()`, latest in migration `0024`).
- Admins give roles in **Admin → Users**. Nobody can change their own role, so the last admin cannot lock themselves out.
- `npm run test:rbac`: checks that `rbac.ts` and `has_perm()` agree for every role and permission, and that every admin page and API needs the right permission. No accounts needed.
- `node scripts/rbac-check.mjs`: logs in as each demo account on the live site and checks every admin page and API. Sends harmless requests only.

## Security notes

- Orders are only created through `create_order()`: prices and stock are read inside the database, so the browser cannot change a price.
- An order becomes Paid only from the Midtrans webhook, after the signature check and a second status lookup. If the amount differs, it is flagged **Needs review** instead.
- Login (5 tries per 5 minutes), register, checkout and event logging are rate limited.
- Users cannot edit their own role (`app_metadata`); it is checked in middleware, route and RLS.
- `SUPABASE_SERVICE_ROLE_KEY` lives only on the server (Vercel), never in the repo.
