# CONTEXT: Anargya Corp (handoff, 11 Nov 2026)

Dokumen untuk sesi Claude berikutnya. Baca bersama `DECISIONS.md` dan `TODO.md`. Info yang belum pasti ditandai **(tanya user)**.

## Ringkasan
- Final project intern Web Development Anargya: website perusahaan fiktif **Anargya Corp**, design house mobil formula listrik di Jepang. Produksi diserahkan ke vehicle manufacturer. Bisnis: distribusi 4 part dan jasa consulting, lalu ekspansi.
- Juri: vehicle manufacturer + management (Finance, Marketing, dan lainnya).
- **Deadline submit: Jumat 13 Nov 2026** (jam belum pasti, anggap 18:00 WIB).
- User hanya mengurus website. Business plan, pitch deck, poster, dan konten lain dari tim lain, jadi angka bisnis yang belum dikirim tetap `[PLACEHOLDER]`.
- Production: `https://finalproject-anargya-a.vercel.app` (Vercel region `syd1`). Repo: `https://github.com/Notdils/Final-Project-Anargya.git`. Supabase region Sydney (`ap-southeast-2`).

## Larangan isi (keras)
- Jangan pernah menyebut **tim riset, ITS, Indonesia** di konten.
- **FSAE Japan** hanya boleh untuk awards di hero (sumber: tim riset Anargya, tapi jangan sebut timnya).
- Tidak ada section milestones.
- Harga: **USD** sebagai harga dasar, dengan **≈ yen** sebagai referensi (di halaman Jepang yen tampil duluan). Ditagih dalam IDR lewat Midtrans; kata "IDR" hanya di checkout, booking, receipt.

## Desain
- Figma: `https://www.figma.com/design/dAypXrqoA5G3zaGGk71ldJ`, page **Anargya Corp: Final Project**. Section berawalan **V3** adalah versi yang dipakai. Frame "Color system (roles)" adalah aturan warna.
- Palet wajib: `#FFFFFF`, `#006F66` teal, `#000000`, `#791600` oxide, `#D08D24` ochre. **Ochre tidak dipakai di permukaan gelap** (CTA di area gelap pakai teal). `#29D970` tidak dipakai.
- Font Geist + Geist Mono. Frame 1280 / 800 / 375. Spacing kelipatan 4/8.

## Fitur yang sudah jalan
- **Halaman:** Home (hero E21 3D + awards FSAE Japan, fly-through, slot poster launch, coverflow), About, Marketplace, Part detail, Cart, Checkout, Receipt, Account, Consulting, Login/Register/Reset, Admin (Overview, Receipts, Bookings), Offline.
- **Bahasa EN/JA:** Inggris di root, Jepang di `/ja/...`. Teks ditulis dalam Inggris di kode dan diterjemahkan lewat `src/i18n/ja.ts` (fallback Inggris). Isi halaman ada di `src/views/*.tsx`, route tipis di `src/app/...` dan `src/app/ja/...`. Admin tetap Inggris.
- **Katalog 4 part** (USD): Uprights & Wheel Hub Kit $2,880, Custom Aero Package $3,600, Custom VCU & BMS $960, Brake Pedal Box $1,440. Gambar render di `public/parts/*.webp`.
- **Model 3D per part** di `public/models/parts/` (meshopt + webp). Tampil di part detail (viewer: putar, zoom, reset, fullscreen) dan di card grid/coverflow (berputar saat hover / card aktif). Mapping sementara: uprights = diffuser, aero = nose + sayap depan, VCU = VCU, pedal box = pedal box. `rear-wing.glb` belum dipakai.
- **Checkout Midtrans:** order hanya dibuat server lewat `create_order_usd_srv` (kurs `FX_USD_IDR` dan ongkir dari env). Lanjutkan bayar, ganti metode, rekonsiliasi status, flag "Needs review" kalau nominal tidak cocok.
- **Consulting = booking berbayar** satu layar: kalender Senin-Jumat 30 hari, slot 09:00/11:00/14:00/16:00 JST, form, bayar Midtrans (`CONSULT_FEE_USD`). Wajib login, satu booking belum dibayar per user, slot ditahan 15 menit, otomatis `confirmed` setelah bayar. Status di `/consulting/booking/[id]`.
- **Keamanan (audit 11 Nov):** RLS di semua tabel, cek Origin untuk POST `/api`, `safeNext` untuk redirect login, rate limit per email dan per IP, service worker hanya cache halaman publik, HSTS, CSP mode Report-Only. Laporan lengkap di luar repo (sudah dikirim ke user).

## Stack dan struktur
- Next.js 15 App Router, React 19.1.10, Tailwind v4, R3F + drei, GSAP ScrollTrigger, Supabase, Midtrans Snap sandbox, ExcelJS.
- `src/lib`: data, catalog, money (USD/JPY), booking, booking-pay, midtrans, reconcile, rate-limit, safe-next, Supabase.
- `supabase/migrations` `0001` sampai `0010`. `tests/sql.test.mjs` menjalankan semuanya di PGlite (`node tests/sql.test.mjs`).
- Env: `FX_USD_IDR`, `NEXT_PUBLIC_FX_USD_JPY` (dibaca saat build, perlu redeploy), `SHIPPING_FLAT_USD`, `CONSULT_FEE_USD`, kunci Supabase dan Midtrans. Rahasia hanya di Vercel env.

## Ditahan (jangan dikerjakan sampai user minta)
- PWA/APK, page loader, chatbot (rencana ada di `chatbot-plan.md` yang dikirim ke user).

## Cara kerja dengan user
Bahasa Indonesia, langsung, tanpa em dash. Tanya dulu untuk pekerjaan besar atau ambigu. Figma dulu untuk UI baru. Jangan mengarang fakta. Git dipegang user (Claude tidak commit atau push, dan tidak pernah menambahkan diri sebagai co-author). Jangan menghapus file, pakai `_to_delete/`. Folder ada di `D:\Anargya-Corp`. Build dan screenshot dilakukan di cloud (`node_modules` di laptop berisi binary Windows). Kirim file ke laptop sebagai tar base64, lalu cek md5 (gambar biner rusak kalau dikirim langsung). Matikan `next-server` lama sebelum start ulang.
