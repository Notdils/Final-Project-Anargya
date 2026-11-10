# CONTEXT: Anargya Corp (handoff, 10 Nov 2026)

Dokumen untuk sesi Claude berikutnya. Baca bersama `DECISIONS.md` dan `TODO.md`. Info yang belum pasti ditandai **(tanya user)**.

## Ringkasan
- Final project intern Web Development Anargya: website perusahaan fiktif **Anargya Corp**, design house mobil formula listrik di Jepang. Produksi diserahkan ke vehicle manufacturer (brief "Final Project Non-Technical" di Materi General).
- Juri: vehicle manufacturer + management (Finance, Marketing, dan lainnya).
- **Deadline submit: Jumat 13 Nov 2026** (jam belum pasti, anggap 18:00). Presentasi bukan tugas web.
- User hanya mengurus website. Business plan dan pitch deck dikerjakan tim lain dan belum ada, jadi semua angka bisnis berupa placeholder.

## Larangan isi (keras)
- Jangan pernah menyebut **tim riset, ITS, Indonesia** di konten.
- Jangan menyebut **FSAE Japan** untuk sekarang.
- Tidak ada section milestones.
- Harga ditampilkan dalam **JPY**. Pembayaran dalam IDR lewat Midtrans, dan kata "IDR" hanya muncul di checkout dan receipt.

## Desain
- Figma: `https://www.figma.com/design/dAypXrqoA5G3zaGGk71ldJ`, page **Anargya Corp: Final Project**.
- Versi yang dipakai: section berawalan **V3** (Home, About, Marketplace, Part detail, Cart, Checkout, Receipt, Login, Register, Admin Overview, Admin Receipts). V1 dan V2 disimpan sebagai pembanding. Frame "Color system (roles)" adalah aturan warna.
- Palet wajib: `#FFFFFF`, `#006F66` teal, `#000000`, `#791600` oxide, `#D08D24` ochre. `#29D970` (hijau Anargya lama) tidak dipakai, karena ini rebranding.
- Font Geist + Geist Mono (gaya shadcn). Frame 1280 / 800 / 375. Spacing kelipatan 4/8.

## Stack dan struktur
- Next.js 15 App Router, React 19, Tailwind v4, R3F + drei (hero E21), GSAP ScrollTrigger (fly-through), Supabase, Midtrans Snap sandbox, ExcelJS.
- `src/app`: route per halaman. `src/components`: UI. `src/lib`: data, Supabase, Midtrans, admin, rate limit.
- `supabase/migrations`: skema, RLS, fungsi (`create_order`, `mark_order_paid`, `mark_order_status`, `hit_rate_limit`, `funnel_counts`), seed placeholder.
- `tests/sql.test.mjs`: tes logika database di PGlite (`npm run test:sql`).
- Model hero: `public/models/e21.glb` (versi optimasi dari Motion-Anargya, 0,89 MB).

## Status (10 Nov sore)
- Semua halaman V3 sudah dibangun. `tsc`, lint, `build` lolos. Screenshot desktop, mobile, dan reduced motion dicek, tanpa error di console.
- Tanpa env Supabase, situs tetap jalan dengan katalog placeholder. Admin menampilkan banner "demo mode", checkout dimatikan.
- **Belum terhubung:** project Supabase, kunci Midtrans, `FX_JPY_IDR`, deploy Vercel. Semua butuh user.

## Cara kerja dengan user
Bahasa Indonesia, langsung, tanpa em dash. Tanya dulu untuk pekerjaan besar. Figma dulu untuk UI baru. Jangan mengarang fakta. Git dipegang user (Claude tidak commit atau push). Jangan menghapus file, pakai `_to_delete/`. Folder ini ada di `D:\Anargya-Corp`. Build dan screenshot dilakukan di cloud, karena `node_modules` di laptop berisi binary Windows.
