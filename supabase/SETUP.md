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
     `https://<username-github>.github.io/<nama-repo>/auth/callback`
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
   with target as (
     select id from public.profiles where email = 'alamanahgknidenpasar@gmail.com'
   )
   update public.profiles set status = 'approved' where id in (select id from target);

   insert into public.user_roles (user_id, role)
   select id, 'admin' from target
   on conflict (user_id, role) do nothing;
   ```

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
