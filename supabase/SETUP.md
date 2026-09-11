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
