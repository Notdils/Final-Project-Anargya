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
