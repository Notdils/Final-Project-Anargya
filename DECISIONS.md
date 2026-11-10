# DECISIONS: Anargya Corp

| Tanggal | Keputusan | Alasan |
|---|---|---|
| 10 Nov | Stack Next.js + Supabase | Diminta user. Poin plus untuk parallax dan animasi 3D |
| 10 Nov | Bahasa situs English saja | Diminta user |
| 10 Nov | Pembayaran Midtrans (IDR), bukan Stripe | Stripe tidak mendukung GoPay dan metode lokal |
| 10 Nov | Harga tampil JPY, ditagih IDR dengan kurs `FX_JPY_IDR` yang dikunci saat order dibuat | Perusahaan diposisikan di Jepang. Kurs dari Finance, tidak ada nilai default |
| 10 Nov | Role cuma `customer` dan `admin`, disimpan di `app_metadata` | Admin mencakup semua akses terbatas. User tidak bisa mengubah `app_metadata` |
| 10 Nov | Siapa saja boleh daftar sebagai customer | Diminta user |
| 10 Nov | Halaman publik tidak butuh login. Checkout, account, receipt, admin butuh login | Juri bisa menilai situs tanpa akun |
| 10 Nov | PWA installable, `start_url=/app` redirect sesuai role. APK lewat TWA nanti | User ingin setara final project staf ahli. Android Studio masih diunduh |
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
