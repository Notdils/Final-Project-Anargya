# TODO: Anargya Corp (11 Nov 2026)

## Butuh user (sebelum demo)
- [ ] Jalankan SQL `0015_product_overview.sql`, `0016_vouchers.sql`, `0017_spd_prices_topics.sql` (harga SPD + topik konsultasi baru), `0018_product_dimensions.sql`, `0019_drop_events.sql` (hapus tabel events), `0020_order_idempotency.sql`, lalu `0021_product_finish.sql` (finish produk). **0016 wajib sebelum deploy versi ini**: checkout memanggil `create_order_usd_srv` versi baru (dengan voucher).
- [ ] (Ditahan, menunggu divisi) Pajak: JP consumption tax 10% untuk tujuan Jepang, ekspor 0%; siapa bayar bea masuk negara lain (DAP/DDP).
- [ ] (Ditahan, menunggu divisi) Kebijakan retur dan garansi.
- [ ] (Ditahan sampai akhir) RBAC: uji semua role.
- [ ] Isi kontak asli di `src/lib/contact.ts` dan logo di `src/components/brand-mark.tsx`.
- [ ] Jalankan SQL `0014_part_models_fix.sql` (model 3D aero = sayap depan + belakang + diffuser; upright tanpa model).
- [ ] Kirim file GLB wheel hub / upright.
- [ ] Jalankan SQL `0013_shipping.sql` (ongkir per tujuan). Wajib sebelum deploy versi ini supaya kolom `ship_country/ship_prefecture/shipping_zone` ada.
- [ ] Isi tarif dan estimasi hari per zona di Admin → Shipping setelah data PLSS datang. Putuskan daftar negara dan batas Jepang Timur/Barat (sekarang [PLACEHOLDER]: Timur = Hokkaido, Tohoku, Kanto, Chubu). Indonesia dan Myanmar nonaktif.
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
- [x] Loader transisi antar halaman (bar teal tipis di atas, `src/components/route-progress.tsx`).
- [x] ~~Chatbot~~ dibatalkan (12 Nov).
- [x] ~~Visualisasi globe 3D~~ dibatalkan (12 Nov). Ongkir lewat field form + Admin → Shipping Cost.

## Belum dibuat (perlu Figma dulu, tanya user)
- [ ] Tampilan audit log di admin (data sudah dicatat di `admin_audit`).

## Teknis kecil
- [ ] Tes performa hero, fly-through, dan card 3D di HP kelas menengah.
- [ ] Lighthouse aksesibilitas setelah deploy.
