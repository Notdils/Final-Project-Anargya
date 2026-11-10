# TODO: Anargya Corp

## Butuh user (blocking deploy)
- [ ] Buat project Supabase, jalankan `0001_schema.sql` lalu `0002_seed.sql`. Isi Site URL dan Redirect URL `https://<domain>/auth/callback`.
- [ ] Daftar akun, lalu jadikan admin dengan SQL di README.
- [ ] Kunci Midtrans sandbox (client + server) dan notification URL `https://<domain>/api/midtrans/notify`.
- [ ] Nilai `FX_JPY_IDR` dari Finance, dan `SHIPPING_FLAT_JPY` dari Procurement & Logistics.
- [ ] Deploy Vercel. Kunci rahasia hanya di env Production. Aktifkan Deployment Protection untuk Preview.
- [ ] `git init` dan commit oleh user.

## Konten (menunggu tim lain)
- [ ] Katalog asli: nama, harga, stok, spesifikasi (Fundraising / Finance). Sekarang semua ¥10.000.
- [ ] Render 3D per part (`products.model_url`) dan cutout untuk fly-through.
- [ ] Story, mission, vision, values (Creative Branding).
- [ ] Isi business model: target market, revenue streams, partner requirements (business plan).
- [ ] Foto workshop dan studio (Motion & Videography).
- [ ] Field receipt dan kolom export final (Finance / FAB).
- [ ] Alamat perusahaan dan kota di Jepang (`[CITY]`).

## Fitur yang belum dibuat (perlu desain Figma dulu, tanya user)
- [ ] Admin Products: ubah harga, stok, featured, aktif, `model_url`. RLS-nya sudah ada.
- [ ] Admin Orders/Users (di Figma ada di sidebar, di kode belum).
- [ ] Viewer 3D per part di detail dan coverflow (kontrol sudah ada, sekarang nonaktif).
- [ ] Loader transisi antar halaman (gaya referensi "• PART NAME").
- [ ] APK via TWA (Bubblewrap + Android Studio) dan `public/.well-known/assetlinks.json`.

## Teknis kecil
- [ ] Tes ulang di perangkat asli: performa fly-through dan hero di HP kelas menengah.
- [ ] Lighthouse PWA + aksesibilitas setelah deploy.
- [ ] Bandingkan proporsi line-art lambang dengan file logo asli.
