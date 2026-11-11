# TODO: Anargya Corp (11 Nov 2026)

## Butuh user (sebelum demo)
- [ ] Jalankan SQL `0007` sampai `0011` berurutan. `0009` dan `0011` harus jalan bersamaan dengan deploy (checkout memakai `create_order_usd_srv`, admin memakai `has_perm`).
- [ ] Vercel env: `CONSULT_FEE_USD` (dari Finance), cek `FX_USD_IDR`, `NEXT_PUBLIC_FX_USD_JPY`, `SHIPPING_FLAT_USD`. Redeploy setelah mengubah env.
- [ ] `npm install` di laptop (React 19.1.10, override `uuid`), lalu commit dan push.
- [ ] Tes di production: checkout, booking konsultasi sampai `confirmed`, login EN dan JA, viewer 3D.
- [ ] Buka Console saat Midtrans Snap terbuka. Kalau tidak ada pelanggaran CSP, ubah `Content-Security-Policy-Report-Only` jadi `Content-Security-Policy` di `next.config.ts`.
- [ ] Cek daftar admin di Supabase (temuan H1) dan promosikan admin berdasarkan UUID, bukan email.
- [ ] Supabase Auth: CAPTCHA, batas sign-in/sign-up, "Secure password change". Setelah demo, nyalakan lagi "Confirm email".
- [ ] Cek riwayat git untuk key yang pernah ter-commit.
- [ ] Tanya sumber dan lisensi model pedal box (nama objek di dalam file merujuk merek Hoonigan).

## Konten (menunggu tim lain)
- [ ] GLB upright/wheel hub. Setelah ada, Aero Package bisa memakai gabungan sayap depan, sayap belakang, diffuser.
- [ ] Biaya konsultasi (`CONSULT_FEE_USD`).
- [ ] Spesifikasi, lead time, stok asli 4 part.
- [ ] Poster launch (Graphic Design), story, mission, vision, values, isi business model, alamat dan `[CITY]`, ongkir, teks consulting, field receipt dan kolom export final.
- [ ] Review terjemahan Jepang oleh penutur Jepang.

## Ditahan (jangan dikerjakan sampai user minta)
- [ ] PWA/APK (TWA, `assetlinks.json`).
- [ ] Loader transisi antar halaman.
- [ ] Chatbot (lihat `chatbot-plan.md`; butuh keputusan scope, provider, budget).

## Belum dibuat (perlu Figma dulu, tanya user)
- [ ] Tampilan audit log di admin (data sudah dicatat di `admin_audit`).

## Teknis kecil
- [ ] Tes performa hero, fly-through, dan card 3D di HP kelas menengah.
- [ ] Lighthouse aksesibilitas setelah deploy.
