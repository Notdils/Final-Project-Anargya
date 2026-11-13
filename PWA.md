# PWA (Progressive Web App)

## Apa itu PWA

PWA adalah website biasa yang bisa dipasang ke HP atau laptop seperti aplikasi. Setelah dipasang:

- Ada ikon di home screen / app drawer / taskbar.
- Dibuka di jendela sendiri tanpa address bar (mode `standalone`).
- Tetap bisa dibuka saat offline untuk halaman yang pernah dikunjungi.
- Tidak lewat Play Store / App Store. Update cukup deploy ke Vercel, semua pengguna langsung dapat versi baru.

Yang membuat sebuah website menjadi PWA ada tiga:

| Bagian | Fungsi |
|---|---|
| HTTPS | Wajib. Vercel sudah HTTPS. |
| Web App Manifest | File JSON berisi nama, ikon, warna, halaman awal, orientasi. Browser membaca ini untuk tombol "Install". |
| Service Worker | Script yang berjalan di belakang halaman dan mencegat request. Dipakai untuk cache dan halaman offline. |

### PWA vs APK

| | PWA | APK (Android native) |
|---|---|---|
| Cara pasang | Dari browser ("Install app" / "Add to Home screen") | Play Store atau file APK |
| Update | Otomatis setiap deploy | Build dan rilis ulang |
| Kode | Sama dengan website | Terpisah (Kotlin / Flutter / dll.) |
| Akses perangkat | Terbatas (tidak ada akses penuh ke sistem) | Penuh |
| iPhone | Didukung lewat Safari (Share → Add to Home Screen) | Tidak bisa |

Untuk Anargya Corp, PWA dipakai sebagai proof of concept "aplikasi" tanpa membuat aplikasi native terpisah.

## Penerapan di Anargya Corp

### Dua aplikasi terpisah

| | Customer | Staff |
|---|---|---|
| Nama | Anargya Corp (short: Anargya) | Anargya Admin |
| Manifest | `/manifest.webmanifest` (route `src/app/manifest.webmanifest/route.ts`) | `public/staff.webmanifest` |
| `id` / `scope` | `/app` / `/` | `/admin` / `/admin` |
| Halaman awal | `/marketplace` | `/admin` |
| Ikon | `public/icons/icon-*.png`, `maskable-512.png` | `public/icons/staff-*.png` (hitam) |
| Shortcut (tekan lama ikon) | Marketplace, Consulting | - |
| Screenshot install dialog | `public/screenshots/*.webp` (narrow + wide) | - |

- Manifest customer tidak menyebut admin sama sekali. Manifest staff hanya di-link dari layout admin, jadi tombol install di halaman admin memasang "Anargya Admin".
- Manifest customer dibuat sebagai route (bukan konvensi `app/manifest.ts`), karena konvensi itu selalu menempelkan link-nya ke semua halaman dan tidak bisa diganti di admin.
- `htmlLimitedBots: /.*/` di `next.config.ts` memastikan `<link rel="manifest">` selalu ada di `<head>`, bukan di-stream ke body (browser hanya membaca manifest dari head).
- Kedua app dikunci `orientation: "portrait"`, `display: "standalone"`, warna tema hitam.

### Service worker (`public/sw.js`)

Didaftarkan oleh `src/components/sw-register.tsx`, hanya di build production.

Strategi cache per jenis request:

| Request | Strategi | Keterangan |
|---|---|---|
| `/_next/static/*`, `/models/*`, `/icons/*` | Cache first | File ber-hash, tidak pernah berubah isinya. Model E21 juga di sini. |
| Gambar di `/brand`, `/home`, `/about`, `/parts`, `/screenshots`, `/_next/image` | Stale-while-revalidate | Tampil langsung dari cache, versi baru diambil di belakang dan muncul di kunjungan berikutnya. Maksimal 80 gambar, yang paling lama dibuang. Hanya `destination === "image"`, jadi video hero (range request 206) tidak ikut. |
| Halaman publik: `/`, `/about`, `/consulting`, `/marketplace`, `/marketplace/[slug]`, `/cart`, `/offline` (dan versi `/ja`) | Network first | Ambil dari server, simpan salinan. Saat offline pakai salinan, kalau tidak ada tampilkan `/offline`. |
| Halaman privat: account, checkout, receipt, booking, admin, login/register, dll. | Network only | Tidak pernah disimpan. Saat offline langsung `/offline`. |
| API, POST, request ke domain lain (Midtrans, Supabase) | Tidak disentuh | Lewat langsung ke jaringan. |

Detail lain:

- **Precache saat install:** `/offline`, `/ja/offline`, `/models/e21.glb`, ikon 192/512, plus semua JS/CSS yang dipakai halaman offline (dibaca dari HTML-nya). Tanpa JS/CSS itu Next.js menampilkan "Application error" saat offline.
- **Logout** (`/api/auth/logout`) menghapus cache halaman, supaya halaman yang tersimpan tidak terbawa ke pengguna berikutnya di perangkat yang sama.
- **Versi cache:** `VERSION = "anargya-v5"`. Naikkan angkanya setiap mengganti file yang di-precache atau ikon. Saat versi baru aktif, cache versi lama dihapus otomatis (`activate`), dan `skipWaiting` + `clients.claim` membuat versi baru langsung dipakai.

### Halaman offline

`/offline` dan `/ja/offline` (`src/views/offline.tsx`): pesan "You are offline", penjelasan bahwa halaman yang pernah dibuka masih tersedia sedangkan checkout dan receipt butuh koneksi, plus tombol Try again.

## Cara memasang

| Perangkat | Cara |
|---|---|
| Android (Chrome) | Buka situs → menu ⋮ → "Install app" / "Add to Home screen". |
| iPhone (Safari) | Tombol Share → "Add to Home Screen". |
| Desktop (Chrome / Edge) | Ikon install di ujung kanan address bar. |
| Staff | Buka `/admin` dulu, baru install. Hasilnya app "Anargya Admin". |

## Cara mengecek

1. Chrome DevTools → **Application** → **Manifest**: nama, ikon, screenshot, tanpa error.
2. **Application** → **Service workers**: status "activated and is running", versi `anargya-v5`.
3. **Application** → **Cache storage**: `anargya-v5-static`, `-pages`, `-images`.
4. **Network** → centang **Offline** → reload halaman publik (masih terbuka) dan `/account` (muncul halaman offline).
5. **Lighthouse** → kategori PWA / installability.

## Batasan

- Fitur yang butuh server (login, checkout, pembayaran Midtrans, booking, chat Customer Service, admin) tidak jalan saat offline.
- Harga dan stok di halaman yang tersimpan bisa sudah lama saat offline. Checkout selalu dicek ulang di server.
- iOS: tidak ada prompt install otomatis dan shortcut tidak didukung.
- Service worker tidak aktif di `npm run dev`. Untuk mengetes, pakai `npm run build && npm start`.
