# TODO: Anargya Corp (12 Nov 2026)

## Butuh user (sebelum demo)
- [ ] Jalankan `supabase/master.sql` sekali di Supabase SQL editor (copy semua, run). Migration yang sudah jalan dilewati otomatis; query terakhir harus 0 baris. Termasuk 0023 (hapus voucher). Urutan deploy dan run SQL bebas: kode baru jalan dengan database sebelum maupun sesudah 0023.
- [ ] (Ditahan, menunggu divisi) Pajak: JP consumption tax 10% untuk tujuan Jepang, ekspor 0%; siapa bayar bea masuk negara lain (DAP/DDP).
- [ ] (Ditahan, menunggu divisi) Kebijakan retur dan garansi.
- [ ] RBAC: jalankan `supabase/maintenance/demo_accounts.sql` di SQL editor (akun demo, daftar di README), lalu `node scripts/rbac-check.mjs` setelah deploy + master.sql (0024). `npm run test:rbac` sudah lolos.
- [ ] Isi kontak asli (telepon, email, sosial media) di `src/lib/contact.ts`.
- [x] Logo A di navbar, footer, splash (`public/brand/logo.webp`, 12 Nov).
- [x] GLB wheel hub + rotor (hub hitam anodize), 12 Nov. Upright terpisah belum ada.
- [x] `_assets/` masuk `.gitignore` (12 Nov).
- [ ] Isi tarif dan estimasi hari per zona di Admin → Shipping setelah data PLSS datang. Putuskan daftar negara dan batas Jepang Timur/Barat (sekarang [PLACEHOLDER]: Timur = Hokkaido, Tohoku, Kanto, Chubu). Indonesia dan Myanmar nonaktif.
- [ ] Vercel env: `CONSULT_FEE_USD` (dari Finance), cek `FX_USD_IDR`, `NEXT_PUBLIC_FX_USD_JPY`, `SHIPPING_FLAT_USD`. Redeploy setelah mengubah env.
- [ ] `npm install` di laptop (React 19.1.10, override `uuid`), lalu commit dan push.
- [ ] Tes di production: checkout, booking konsultasi sampai `confirmed`, login EN dan JA, viewer 3D.
- [ ] Buka Console saat Midtrans Snap terbuka. Kalau tidak ada pelanggaran CSP, ubah `Content-Security-Policy-Report-Only` jadi `Content-Security-Policy` di `next.config.ts`.
- [ ] Cek daftar admin di Supabase (temuan H1) dan promosikan admin berdasarkan UUID, bukan email.
- [ ] Supabase Auth: CAPTCHA, batas sign-in/sign-up, "Secure password change". Setelah demo, nyalakan lagi "Confirm email".
- [ ] Cek riwayat git untuk key yang pernah ter-commit.
- [ ] Tanya sumber dan lisensi model pedal box (nama objek di dalam file merujuk merek Hoonigan).

## Konten (menunggu tim lain)
- [x] GLB wheel hub (12 Nov).
- [ ] Biaya konsultasi (`CONSULT_FEE_USD`).
- [ ] Spesifikasi, lead time, stok asli 4 part.
- [ ] Poster (Graphic Design): ekspor ulang 2x (2160 × 2700) dengan nama sama, dan mobil tanpa tulisan "Institut Teknologi Sepuluh Nopember" + bendera. Taruh di `_assets/poster/`, lalu jalankan `scripts/poster-assets.py`.
- [ ] Story, mission, vision, isi business model, alamat, ongkir, teks consulting, field receipt dan kolom export final.
- [ ] Review terjemahan Jepang oleh penutur Jepang.

## Ditahan (jangan dikerjakan sampai user minta)
- [ ] PWA/APK (TWA, `assetlinks.json`).
- [x] Loader transisi antar halaman (bar teal tipis di atas, `src/components/route-progress.tsx`).
- [x] ~~Chatbot~~ dibatalkan (12 Nov).
- [x] ~~Visualisasi globe 3D~~ dibatalkan (12 Nov). Ongkir lewat field form + Admin → Shipping Cost.

## Figma
- [ ] Samakan Figma dengan web: hero About (poster), five-year plan (garis sebelum tahun 1/sesudah tahun 5, counter di bawah teks), immersive 3D, splash, judul hero "Parts & Consultation", section values dihapus, navbar penuh mulai 1120 px.

## Fitur menunggu aset
- [ ] Immersive 3D: glow untuk part yang dijual + bagian lain transparan. Butuh model mobil dengan part terpisah dan bernama.

## Belum dibuat (perlu Figma dulu, tanya user)
- [ ] Tampilan audit log di admin (data sudah dicatat di `admin_audit`).

## Teknis kecil
- [ ] Tes performa hero, fly-through, dan card 3D di HP kelas menengah.
- [ ] Lighthouse aksesibilitas setelah deploy.
