# Panduan Setup Supabase — Mushalla Al Amanah GKN I Denpasar

Ikuti langkah-langkah ini secara berurutan di **Supabase Dashboard** (https://supabase.com/dashboard),
buka project `ndbykvluzqvvmyjriwop`.

---

## 1. Jalankan skema database

1. Buka menu **SQL Editor** (ikon `>_` di sidebar kiri) → **New query**.
2. Buka file [`schema.sql`](./schema.sql) di folder ini, salin **seluruh isinya**, tempel ke SQL Editor.
3. Klik **Run**. Jika sukses akan muncul "Success. No rows returned".
4. Ini akan membuat:
   - Semua tabel (profiles, user_roles, kajian_schedule, infaq_info, social_links,
     about_content, financial_transactions, inventory_items, articles, dll)
   - Trigger otomatis: setiap user baru mendaftar → otomatis dibuatkan baris di `profiles`
     dengan status `pending`.
   - Row Level Security (RLS) untuk semua tabel — publik hanya bisa membaca data yang
     memang untuk publik, dan menulis dibatasi sesuai role (admin/bendahara/inventaris).
   - Storage bucket `media` (publik, untuk gambar sampul artikel & QRIS infaq).

Aman dijalankan berkali-kali (idempotent) — jika ingin mengubah skema di kemudian hari,
tinggal jalankan ulang file ini.

---

## 1b. Migrasi (untuk database yang sudah pernah setup sebelumnya)

Kalau kamu sudah pernah menjalankan `schema.sql` versi sebelumnya (sudah ada data user,
dsb), jalankan 2 file migrasi ini **secara berurutan, di dua query terpisah**:

1. Jalankan seluruh isi [`migration_002a_enum.sql`](./migration_002a_enum.sql) dulu, klik
   **Run**, tunggu sampai sukses.
2. Baru buka **New query** lagi, jalankan seluruh isi
   [`migration_002b_finance_roles.sql`](./migration_002b_finance_roles.sql).

(Harus 2 langkah terpisah karena PostgreSQL tidak mengizinkan nilai enum baru — role
"humas" — langsung dipakai di transaksi yang sama saat ia dibuat.)

Kalau kamu sudah pernah menjalankan migrasi di atas sebelumnya dan sekarang cuma perlu
menambahkan halaman **Referensi** (daftar Ustadz), jalankan juga:

3. [`migration_003_referensi.sql`](./migration_003_referensi.sql) — bikin tabel `ustadz`
   khusus untuk halaman Dashboard → Referensi (hanya admin yang bisa akses).

Kalau kamu sudah pernah menjalankan semua migrasi di atas dan sekarang cuma perlu
menambahkan fitur **foto profil**, jalankan juga:

4. [`migration_004_avatar.sql`](./migration_004_avatar.sql) — tambah kolom `avatar_url`
   pada `profiles` + izin storage supaya tiap user bisa unggah foto profilnya sendiri.

Kalau kamu sudah pernah menjalankan migrasi (1)-(4) dan sekarang perlu update **struktur
Inventaris** (Kode Barang otomatis, Nilai, Tahun Perolehan, riwayat Hibah/Hapus), jalankan:

5. [`migration_005_inventaris.sql`](./migration_005_inventaris.sql) — barang inventaris lama
   (kalau ada) otomatis dipetakan ke kategori "Barang Lainnya" (9000) dengan Kode Barang
   baru; silakan koreksi Kategori-nya manual lewat Dashboard → Inventaris setelah migrasi.

Kalau kamu sudah pernah menjalankan migrasi (1)-(5) dan sekarang cuma perlu menambahkan
**foto barang** di Inventaris, jalankan:

6. [`migration_006_foto_barang.sql`](./migration_006_foto_barang.sql) — tambah kolom
   `foto_url` pada `inventory_items`.

Kalau kamu sudah pernah menjalankan migrasi (1)-(6) dan sekarang perlu menambahkan
**Kriteria "Infaq Buka Puasa"** (+ tab Buka Puasa di Keuangan), jalankan:

7. [`migration_007_infaq_buka_puasa.sql`](./migration_007_infaq_buka_puasa.sql) — tambah
   nilai enum `financial_kriteria` baru. **Jalankan file ini sendirian** (Run terpisah,
   tidak digabung query lain).

Kalau kamu sudah pernah menjalankan migrasi (1)-(7) dan sekarang perlu menambahkan
**Jenis rekening "Infaq Buka Puasa"** + **Kriteria "Setor UP Tunai" & "Terima UP
Tunai"**, jalankan:

8. [`migration_008_up_tunai_buka_puasa.sql`](./migration_008_up_tunai_buka_puasa.sql) —
   tambah nilai enum `financial_jenis` & `financial_kriteria` baru. **Jalankan file ini
   sendirian** (Run terpisah, tidak digabung query lain).

Kalau kamu sudah pernah menjalankan migrasi (1)-(8) dan sekarang perlu melengkapi
**Jadwal Kajian** (foto pamflet, status Live YouTube otomatis), jalankan:

9. [`migration_009_kajian_lengkap.sql`](./migration_009_kajian_lengkap.sql) — tambah
   kolom `foto_url`, `live_video_id`, `live_by_name`, `live_started_at` pada
   `kajian_schedule`, dan izinkan role **humas** membaca daftar Ustadz (dipakai
   sebagai dropdown di form Jadwal Kajian).

Migrasi (1) & (2) ini akan:
- Menambah role **humas** (bisa mengelola jadwal kajian, infaq, sosmed, tentang mushalla).
- Merombak tabel `financial_transactions` ke struktur baru: **Periode, Kriteria, Debet,
  Kredit, Keterangan, Jenis (BRI/BSI/UP Tunai)** — saldo dihitung otomatis oleh aplikasi,
  tidak disimpan di database. Data transaksi lama otomatis dipetakan ke kolom baru
  (kategori bebas → Kriteria terdekat, jumlah+masuk/keluar → Debet/Kredit). Silakan cek
  dan koreksi manual lewat Dashboard → Keuangan setelah migrasi bila ada yang meleset.
- Admin jadi **hanya bisa melihat** (read-only) di menu Keuangan & Inventaris — input/
  edit/hapus data hanya bisa oleh role **bendahara** (Keuangan) dan **pengelola
  inventaris** (Inventaris).
- Admin bisa menghapus profil user dari menu Verifikasi User (catatan: ini tidak
  menghapus akun login Supabase Auth-nya, hanya menghapus data profil & role di
  aplikasi — untuk hapus akun login sepenuhnya, lakukan manual lewat Dashboard Supabase
  → Authentication → Users).

---

## 2. Konfigurasi Authentication (Email)

Buka menu **Authentication → Providers**:

1. Pastikan **Email** provider **Enabled**.
2. Di **Authentication → Providers → Email**, pastikan opsi **"Confirm email"** dinyalakan
   (ON) — supaya user harus mengklik link konfirmasi di email asli sebelum bisa login
   (ini yang membuat "register pakai email real" berfungsi).
3. Buka **Authentication → URL Configuration**:
   - **Site URL**: isi dengan URL GitHub Pages kamu setelah deploy, contoh:
     `https://<username-github>.github.io/<nama-repo>/`
   - **Redirect URLs**: tambahkan juga:
     `https://<username-github>.github.io/<nama-repo>/auth/callback` dan
     `https://<username-github>.github.io/<nama-repo>/reset-password` (dipakai oleh
     tombol "Lupa password?" di halaman Masuk)
     (boleh tambahkan juga `http://localhost:5173/*` untuk development lokal)

   > Jika kamu belum deploy dan belum tahu URL final, isi dulu dengan `http://localhost:5173`,
   > lalu **update lagi setelah deploy ke GitHub Pages** — kalau tidak, link konfirmasi email
   > akan mengarah ke tempat yang salah.

4. (Opsional, disarankan) Buka **Authentication → Emails** untuk menyesuaikan template
   email "Confirm signup" — misalnya ganti judul/isi jadi berbahasa Indonesia dan
   menyebut nama "Mushalla Al Amanah GKN I Denpasar".

---

## 3. Jadikan akun pertama sebagai Admin

1. Buka aplikasi (lokal `npm run dev` atau setelah live di GitHub Pages).
2. **Daftar** akun baru menggunakan email: `alamanahgknidenpasar@gmail.com`
   (email ini yang disepakati sebagai admin pertama).
3. Cek inbox email tersebut, klik link konfirmasi.
4. Kembali ke **Supabase SQL Editor**, jalankan query berikut untuk menjadikan akun
   tadi sebagai admin dan otomatis approved:

   ```sql
   -- Jadikan alamanahgknidenpasar@gmail.com sebagai admin pertama
   update public.profiles
   set status = 'approved'
   where email = 'alamanahgknidenpasar@gmail.com';

   insert into public.user_roles (user_id, role)
   select id, 'admin'
   from public.profiles
   where email = 'alamanahgknidenpasar@gmail.com'
   on conflict (user_id, role) do nothing;
   ```

   Cek hasilnya dengan:

   ```sql
   select p.email, p.status, r.role
   from public.profiles p
   left join public.user_roles r on r.user_id = p.id
   where p.email = 'alamanahgknidenpasar@gmail.com';
   ```

   Harus muncul baris dengan `status = approved` dan `role = admin`.

5. Login ulang (atau refresh) di aplikasi — menu **Dashboard** akan muncul di navbar,
   dan admin bisa mengakses **Verifikasi User**, **Moderasi Artikel**, dan **Pengaturan Konten**.

Untuk menambahkan admin/bendahara/inventaris berikutnya, tidak perlu SQL lagi — admin
tinggal buka **Dashboard → Verifikasi User** dan klik badge role yang diinginkan pada
user yang bersangkutan.

---

## 4. (Opsional) Isi konten awal

Setelah login sebagai admin, buka **Dashboard → Pengaturan Konten** untuk mengisi:

- Jadwal kajian rutin
- Info rekening/e-wallet infaq
- Link media sosial
- Profil "Tentang Mushalla"
- Override jadwal shalat (jika perlu koreksi manual, mis. jadwal Jumat)

Jadwal shalat harian di landing page dihitung **otomatis** (Aladhan API, metode Kemenag,
lokasi Denpasar) — tidak perlu diisi manual kecuali ingin override tanggal tertentu.

---

## 5. (Opsional) Live YouTube otomatis di Jadwal Kajian

Fitur ini membuat Dashboard → Pengaturan Konten → Jadwal Kajian bisa **otomatis mendeteksi**
saat channel YouTube `alamanahgknidenpasar@gmail.com` sedang live, tanpa perlu tempel link
manual. Ini opsional — kalau langkah ini dilewati, semua fitur lain tetap jalan normal,
cuma tombol "Live"-nya tidak akan mendeteksi apa-apa.

Perlu 2 nilai dari **Google Cloud Console** (punya akun Google yang sama dengan
`alamanahgknidenpasar@gmail.com`, atau akun lain yang jadi pengelola channel-nya):

1. Buka https://console.cloud.google.com/ → buat project baru (nama bebas, mis. "Al Amanah Website").
2. Menu **APIs & Services → Library**, cari **"YouTube Data API v3"**, klik **Enable**.
3. Menu **APIs & Services → Credentials → Create Credentials → API key**. Salin API key
   yang muncul — ini nilai **`VITE_YOUTUBE_API_KEY`**.
4. **Penting (keamanan):** klik API key yang baru dibuat tadi → di bagian **Application
   restrictions** pilih **Websites** → tambahkan alamat website kamu, contoh:
   `https://<username-github>.github.io/*`. Ini supaya API key tidak bisa dipakai
   sembarangan orang dari website lain.
5. Cari **Channel ID** channel YouTube `alamanahgknidenpasar@gmail.com`: login ke YouTube
   pakai akun itu → **YouTube Studio** → **Setelan → Channel → Info dasar** → salin
   **Channel ID** (diawali `UC...`). Ini nilai **`VITE_YOUTUBE_CHANNEL_ID`**.
6. Tambahkan kedua nilai ini sebagai **GitHub Actions secrets** di repo (Settings →
   Secrets and variables → Actions → New repository secret), sama seperti
   `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`:
   - `VITE_YOUTUBE_API_KEY`
   - `VITE_YOUTUBE_CHANNEL_ID`
7. Push ulang (atau re-run GitHub Actions workflow-nya) supaya nilai baru ini ikut ter-build.

Cara kerja setelah ini terpasang: saat halaman Dashboard → Pengaturan Konten → Jadwal
Kajian dibuka dan ada jadwal kajian untuk **hari ini**, aplikasi otomatis mengecek berkala
ke YouTube apakah channel sedang live; begitu terdeteksi, video langsung muncul ter-embed
di beranda pada jadwal kajian tersebut. Tombol **"Mulai Live"** di tabel jadwal juga bisa
dipakai untuk langsung membuka YouTube Studio (memulai siaran) sekaligus mencatat siapa
yang menekannya dan jam berapa.

## 6. (Opsional) Upload Pamflet otomatis ke Google Drive

Fitur ini menambahkan tombol **"Upload ke Google Drive"** di form Pamflet (Dashboard →
Pengaturan Konten → Jadwal Kajian): tinggal pilih gambar dari HP/komputer, otomatis
diunggah ke folder **"Pamflet"** di Google Drive (dibuat otomatis kalau belum ada),
dibagikan "siapa saja yang punya link", dan link-nya otomatis tersimpan -- tidak perlu
lagi buka Google Drive manual lalu tempel link. Ini opsional -- kalau langkah ini
dilewati, form Pamflet tetap bisa dipakai dengan cara tempel link manual seperti biasa.

Setelah langkah ini aktif, tombol **"🎨 Buat Otomatis"** juga otomatis muncul di form
yang sama: pamfletnya digambar sendiri oleh aplikasi (judul, ustadz, tanggal (Masehi +
perkiraan Hijriah), jam, lokasi, rekening Infaq, kontak WhatsApp, dan platform live --
semua diambil dari data yang sudah diisi di Dashboard, tidak perlu desain manual di
Canva dkk), lalu diunggah lewat jalur Google Drive yang sama persis seperti di atas.
Ada beberapa pilihan tema warna yang bisa diganti-ganti (tombol "Buat Ulang") sebelum
dipakai.

Caranya lewat **Google Apps Script (GAS)** -- jauh lebih sederhana daripada bikin OAuth
di Google Cloud Console: tidak perlu OAuth consent screen, tidak perlu daftar Test user,
dan siapa pun yang pakai tombol upload ini **tidak perlu login Google sendiri** --
upload berjalan otomatis di sisi Google memakai akun pengurus yang men-deploy script-nya.

1. Login ke Gmail akun pengurus yang Drive-nya akan dipakai untuk menyimpan pamflet
   (boleh `alamanahgknidenpasar@gmail.com` atau akun pengurus lain), lalu buka
   https://script.google.com/ → **New project**.
2. Hapus semua kode contoh di editor, lalu salin-tempel seluruh isi file
   `google-apps-script/Code.gs` (ada di dalam paket/folder proyek ini) ke sana.
3. Di baris paling atas kode itu, ganti nilai `TOKEN`:
   ```
   var TOKEN = "GANTI_DENGAN_TOKEN_RAHASIA_KAMU";
   ```
   Ganti `GANTI_DENGAN_TOKEN_RAHASIA_KAMU` dengan teks rahasia bebas (kombinasi huruf/angka
   acak, mis. `alamanah-2026-x7kq`) -- ini semacam kata sandi supaya alamat upload-nya
   tidak bisa dipakai sembarang orang lain. Simpan project (ikon disket / Ctrl+S), beri
   nama bebas (mis. "Upload Pamflet Al Amanah").
4. Klik **Deploy → New deployment**. Klik ikon gerigi di sebelah "Select type" → pilih
   **Web app**. Isi:
   - **Execute as**: **Me** (akun kamu yang sedang login).
   - **Who has access**: **Anyone**.
   Klik **Deploy**. Kalau muncul jendela izin ("Authorize access"), pilih akun Google
   kamu → klik **Advanced/Lanjutan** → **Go to (nama project) (unsafe)** → **Allow/Izinkan**
   (wajar muncul peringatan ini karena scriptnya baru kamu buat sendiri, belum diverifikasi
   Google -- aman karena kamu yang menulis kodenya sendiri).
5. Setelah deploy selesai, salin **Web app URL** yang muncul (diakhiri `/exec`) -- ini
   nilai **`VITE_GAS_UPLOAD_URL`**. Nilai **`VITE_GAS_UPLOAD_TOKEN`** adalah token rahasia
   yang kamu isi di langkah 3 tadi (harus sama persis).
6. Tambahkan kedua nilai ini sebagai **GitHub Actions secrets** (Settings → Secrets and
   variables → Actions → New repository secret), sama seperti secret lainnya:
   - `VITE_GAS_UPLOAD_URL`
   - `VITE_GAS_UPLOAD_TOKEN`
7. Push ulang (atau re-run GitHub Actions workflow-nya) supaya nilai baru ini ikut ter-build.

Cara pakai: klik **"Upload ke Google Drive"**, pilih gambar pamflet -- tanpa perlu login
Google apa pun, file langsung terunggah ke folder "Pamflet" di Drive akun yang men-deploy
script tadi, dan pamfletnya langsung tampil di beranda.

Kalau nanti perlu mengubah kode Apps Script-nya lagi, buka kembali project di
https://script.google.com/, edit kodenya, lalu **Deploy → Manage deployments → ikon pensil
→ Version: New version → Deploy** (URL Web app-nya tetap sama, tidak perlu ganti secret).

---

## Ringkasan Role & Hak Akses

| Role         | Hak Akses                                                             |
|--------------|------------------------------------------------------------------------|
| *(tanpa role)* | Bisa daftar, login, isi profil, tulis artikel (setelah **status approved**) |
| `admin`      | Semua akses: verifikasi user, atur role, moderasi artikel, keuangan, inventaris, pengaturan konten |
| `bendahara`  | Kelola (tambah/hapus) transaksi keuangan di Dashboard → Keuangan       |
| `inventaris` | Kelola (tambah/ubah/hapus) data barang di Dashboard → Inventaris       |

Status user (`pending` / `approved` / `rejected`) terpisah dari role. User baru mendaftar
→ status `pending` → admin approve di **Verifikasi User** → baru bisa menulis artikel
dan mengakses dashboard sesuai role yang diberikan.
