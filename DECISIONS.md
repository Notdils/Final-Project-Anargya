# DECISIONS: Anargya Corp

| Tanggal | Keputusan | Alasan |
|---|---|---|
| 10 Nov | Stack Next.js + Supabase | Diminta user. Poin plus untuk parallax dan animasi 3D |
| 10 Nov | ~~Bahasa situs English saja~~ (diganti 11 Nov: EN/JA) | Diminta user |
| 10 Nov | Pembayaran Midtrans (IDR), bukan Stripe | Stripe tidak mendukung GoPay dan metode lokal |
| 10 Nov | ~~Harga tampil JPY, ditagih IDR dengan kurs `FX_JPY_IDR`~~ (diganti 11 Nov: USD) | Perusahaan diposisikan di Jepang. Kurs dari Finance, tidak ada nilai default |
| 10 Nov | Role cuma `customer` dan `admin`, disimpan di `app_metadata` | Admin mencakup semua akses terbatas. User tidak bisa mengubah `app_metadata` |
| 10 Nov | Siapa saja boleh daftar sebagai customer | Diminta user |
| 10 Nov | Halaman publik tidak butuh login. Checkout, account, receipt, admin butuh login | Juri bisa menilai situs tanpa akun |
| 10 Nov | PWA installable, `start_url=/app` redirect sesuai role. APK lewat TWA nanti (ditahan sejak 10 Nov) | User ingin setara final project staf ahli. Android Studio masih diunduh |
| 10 Nov | Tidak membuat halaman `/partnership` dan `/engineering` | Diminta user, produk riil belum ada |
| 10 Nov | Warna V3: teal = struktur/identitas/sukses, ochre = aksi utama (maks satu per tampilan), oxide = urgensi/error, hitam = stage 3D | Kritik user: warna harus punya peran, bukan sekadar ganti background |
| 10 Nov | Hero = model E21 full-bleed + teks kiri bawah (gaya McLaren), plus indikator scroll | Diminta user: visual hook langsung |
| 10 Nov | Fly-through setelah hero (skill motion-parallax): "Designing cars?" lalu "We got you covered." Objek placeholder, line-art lambang dua untai Anargya | Diminta user. Render part 3D menyusul |
| 10 Nov | Coverflow "Featured parts" di Home dan Marketplace. Kode part (`AN-AERO-01`) menggantikan angka dekoratif | Referensi myrefactory.com dari user |
| 10 Nov | Loader transisi antar halaman ditunda | Diminta user, dibahas terpisah |
| 10 Nov | Ekstraksi part dari model E21 ditunda | Diminta user. Render part sedang dibuat tim |
| 10 Nov | Order dibuat hanya lewat `create_order()` (harga dan stok dibaca di DB, `FOR UPDATE`). Stok berkurang hanya di `mark_order_paid()` dari webhook Midtrans yang sudah diverifikasi | Menjawab pertanyaan interview soal race condition, dan kritik spam di Energize Talk |
| 10 Nov | Kalau dua pembeli membayar unit terakhir, pembayaran kedua tetap dicatat `paid` dengan `oversold = true` (tidak error) | Supaya uang yang sudah masuk tidak membuat order macet. Admin melihat badge "Refund or restock" |
| 10 Nov | Rate limit di database: login 5x/5 menit (email+IP), register 5x/jam per IP, checkout 5x/10 menit per user, reset password, event | Kritik reviewer soal tidak ada rate limit |
| 10 Nov | Analytics milik sendiri (tabel `events`, session id acak, tanpa cookie), dipakai untuk funnel admin | Konversi Home ke Marketplace diminta user. Tanpa pihak ketiga |
| 10 Nov | Export CSV + XLSX dengan kolom draft. Field final menunggu Finance (FAB) | Diminta user |
| 10 Nov | Footer wordmark raksasa hanya di halaman publik. Halaman transaksi, auth, dan admin pakai footer tipis | Temuan review Figma lama: wordmark muncul di semua halaman termasuk admin |
| 10 Nov | CTA di permukaan gelap pakai teal, bukan ochre | Kritik user: ochre di atas hitam terasa seperti palet situs dewasa |
| 10 Nov | Halaman publik statis, status login dibaca di browser, middleware hanya di route terlindungi | Performa: loading terasa berat |
| 11 Nov | Hanya 4 part yang dijual (uprights kit, aero package, VCU & BMS, pedal box) | Hasil meeting tim |
| 11 Nov | Harga dasar USD, yen sebagai referensi (`NEXT_PUBLIC_FX_USD_JPY`), ditagih IDR dengan `FX_USD_IDR` | Diminta user ("tampilkan USD/Yen") |
| 11 Nov | Situs dua bahasa EN/JA, Jepang di `/ja`, terjemahan oleh Claude | Hasil meeting tim. Admin tetap Inggris |
| 11 Nov | Hero kanan bawah = awards FSAE Japan (PR Awards winner 2025, 1st SEA ranking 2024, 2nd EV overseas 2024) | Hasil meeting. FSAE Japan hanya boleh di sini |
| 11 Nov | Foto workshop di Home diganti slot poster launch (4:5) dari Graphic Design | Hasil meeting |
| 11 Nov | Consulting jadi satu layar booking berbayar Midtrans, form sendiri di Supabase | Diminta user: langsung booking tanpa section lain |
| 11 Nov | Model 3D per part dipasang sementara apa adanya (uprights card = diffuser) | Diminta user untuk preview. Ganti saat GLB upright ada |
| 11 Nov | Order dibuat hanya oleh server (`create_order_usd_srv`), satu booking belum dibayar per user, slot ditahan 15 menit | Hasil audit keamanan 11 Nov |
| 11 Nov | PWA, page loader, chatbot ditahan | Diminta user. Rencana chatbot sudah dibuat |
| 11 Nov | RBAC dengan 4 role staf (admin, catalog, ops, finance), dicek di middleware, route, dan RLS | Diminta user: role based access. Peta izin di `src/lib/rbac.ts` = `has_perm()` |
| 11 Nov | Media produk diunggah ke Supabase Storage `part-media` lewat server (cek role + isi file) | Diminta user: products pakai upload storage |
| 11 Nov | Status kirim (To pack, Shipped, Delivered) + kurir + resi diisi ops, tampil di receipt | Desain Admin Orders |
| 12 Nov | Chatbot dan visualisasi globe dibatalkan; page loader dibuat (bar progres teal di atas) | Diminta user |
| 12 Nov | Funnel buatan sendiri dan tabel `events` dihapus; kunjungan pakai Vercel Analytics | Diminta user (0019) |
| 12 Nov | Fly-through parallax tetap jalan penuh walau `prefers-reduced-motion` aktif | Diminta user, setelah diberi opsi versi lembut (fade tanpa zoom). Risiko: pengguna sensitif gerakan |
| 12 Nov | Five-year plan jadi timeline vertikal, satu tahun per layar (100vh), bulatan aktif membesar di tengah layar; slot poster dihapus. Judul hero jadi "Parts & Consultation" satu baris | Diminta user, desain di Figma section "V3 · Home / Five-year plan (vertical, one year per screen)" |
| 12 Nov | Section "What we stand for" di Home dihapus | Diminta user |
| 12 Nov | Hero About diganti poster peluncuran beranimasi (ANARGYA naik, mobil mengecil ke posisinya); teks poster ditulis ulang sebagai HTML tanpa ITS/Indonesia. Lapisan dari Graphic Design, diproses `scripts/poster-assets.py` | Diminta user. Menunggu: mobil tanpa tulisan ITS + bendera, ekspor 2x |
| 12 Nov | `@vercel/analytics` dihapus (Web Analytics tidak dipakai) | Diminta user |
| 13 Nov | Sistem voucher/diskon dihapus (kode + migration 0023). Kolom `discount_usd`/`voucher_code` di orders tetap sebagai riwayat | Diminta user: tidak ada dalam rencana |
| 13 Nov | Five-year plan pindah dari Home ke About (di bawah misi & visi), jadi satu section statis: 5 tahun berjajar horizontal (md ke atas), daftar vertikal statis di HP. Timeline scroll lama dipindah ke `_to_delete` | Diminta user |
| 13 Nov | Parallax Home memakai render statis 6 model part (2 per gelombang, 3 slot dihapus). Business model + capabilities pindah dari About ke Marketplace. Consulting: section "What your consultation covers", FAQ, CTA ke form | Diminta user. FAQ hanya memuat fakta dari alur booking; reschedule/refund diarahkan ke email karena kebijakannya belum ada |
| 13 Nov | Durasi konsultasi jadi 90 menit (teks saja; slot 09/11/14/16 JST tidak bertabrakan). Hover teal (`.card-hover`) untuk kartu info, kartu produk, dan FAQ | Diminta user |
| 13 Nov | Hover teal penuh dicabut dari kartu info. Hanya kartu produk (bisa diklik) yang punya hover: border teal, naik 4px, panah View bergeser. Logo SVG di parallax dihapus | Diminta user; kartu yang tidak bisa diklik tidak boleh terlihat bisa diklik |
| 13 Nov | RBAC: Ops dapat `products.read` (0024). Bug diperbaiki: middleware memblokir "Check Midtrans" untuk Finance (route minta `orders.read`, middleware minta `orders.fulfil`). Admin tetap tidak bisa ubah role sendiri. Tes `test:rbac` + skrip cek live | Diminta user |
| 13 Nov | Akun demo per role (admin, catalog, ops, finance, customer) dengan password ditulis di README | Diminta user, sudah diberi tahu repo publik sehingga siapa pun bisa login sebagai admin |
| 13 Nov | Tidak dikerjakan: review terjemahan JA, PWA/APK, pengamanan Supabase Auth pasca-demo, penghapusan akun demo. Lisensi model pedal box dianggap aman | Diminta user: situs tidak dipakai lagi setelah demo |
| 13 Nov | Area pengantaran dan biaya kirim belum fix (PLSS ada perubahan, belum di-brief) | Catatan dari user |
| 13 Nov | PWA: ikon app dan favicon diganti ke logo A (sebelumnya simbol untai lama), screenshot di manifest untuk dialog install, halaman offline EN/JA beserta JS/CSS-nya di-precache, halaman privat yang dibuka saat offline menampilkan halaman offline (tetap tidak di-cache). Cache versi v3 | Diminta user: PWA sebagai proof of concept |
| 13 Nov | PWA dipisah: app pelanggan (`/manifest.webmanifest`, ikon teal, mulai di /marketplace, shortcut Marketplace + Consulting, tanpa sebutan admin) dan app staf (`/staff.webmanifest`, "Anargya Admin", ikon hitam, hanya ditautkan dari halaman admin). Orientasi tetap portrait. Teks "Admin access is granted by the team" di halaman register dihapus. `htmlLimitedBots` agar link manifest selalu di <head> | Diminta user: pelanggan tidak boleh melihat sebutan admin |
| 13 Nov | Ongkir DHL per box: jumlah qty x tarif kawasan per part, USD, pakai nilai tengah rentang PLSS (angka ribuan di file dibetulkan: mis. 1.25 = 1.250). Jepang: ongkir dibayar customer ke kurir (checkout 0). Indonesia dibuka; Macao, Mongolia, Brunei, Kamboja, Laos, Timor-Leste, Nepal, Bhutan, Maladewa, Myanmar dimatikan; Rusia tidak ditawarkan. Gambar di service worker: stale-while-revalidate | Data dan keputusan PLSS/user |
| 13 Nov | Hero Home: video tim sebagai latar (gelap 60%, tanpa suara, loop; desktop 1280x960 3,2 MB, HP portrait potongan tengah 540x720 1,6 MB). Tidak dimuat untuk reduced motion, disembunyikan di mode immersive (latar tetap hitam), ikut berhenti dengan tombol Pause. Our story di About: latar gradasi teal #006F66 ke #2B837B (warna wordmark poster), teks putih | Diminta user |
| 13 Nov | Mobil 3D E21 dipindah dari hero Home ke About (Our story, kolom kiri di bawah judul) lengkap dengan pause, zoom dan full screen. Hero Home tinggal video + teks, dengan tombol pause video. Kolom kiri Our story tidak sticky lagi agar full screen tidak tertutup header. Menu admin "Shipping Cost" jadi "Shipping Costs" | Diminta user |
| 13 Nov | Alamat pengiriman bisa ditambah/diedit di Account. Jepang jadi satu tujuan (0026), tanpa Timur/Barat: zona JP aktif, JP-EAST/JP-WEST dimatikan (riwayat order tetap). Checkout dan Account tidak lagi meminta wilayah Jepang | Diminta user |
| 13 Nov | Chat customer service (0027): card teal di atas kalender Consulting, panel melayang kanan bawah, sapaan otomatis "What can we help you with?", hanya untuk akun yang login, pesan tersimpan, balasan muncul dalam beberapa detik (polling). Semua role staf membalas di Admin → Inbox (izin support.reply). Booking jadi 3 langkah dengan progress bar: tanggal & jam, data diri, pembayaran. "video call" jadi "meetup/call" | Diminta user |
