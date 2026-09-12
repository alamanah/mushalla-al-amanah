# Mushalla Al Amanah GKN I Denpasar — Aplikasi Web

Website & sistem informasi untuk Mushalla Al Amanah GKN I Denpasar: jadwal shalat otomatis,
jadwal kajian, info infaq, laporan keuangan transparan, bacaan/artikel Islami dari jamaah,
serta panel pengurus (verifikasi jamaah, moderasi artikel, keuangan, inventaris).

**Stack**: React + TypeScript + Vite + Tailwind CSS, backend **Supabase** (Auth + Database + Storage),
di-deploy sebagai situs statis ke **GitHub Pages**.

---

## 1. Setup Supabase (wajib dilakukan dulu)

Ikuti panduan lengkap di [`supabase/SETUP.md`](./supabase/SETUP.md):
1. Jalankan `supabase/schema.sql` di SQL Editor Supabase.
2. Aktifkan & konfigurasi Email Auth (confirm email + redirect URL).
3. Daftar akun `alamanahgknidenpasar@gmail.com` lalu jadikan admin lewat query yang disediakan.

---

## 2. Jalankan di komputer lokal (opsional, untuk development)

Prasyarat: [Node.js](https://nodejs.org) versi 18 ke atas.

```bash
npm install
cp .env.example .env   # sudah terisi URL & anon key Supabase project ini
npm run dev
```

Buka http://localhost:5173

---

## 3. Deploy ke GitHub Pages

### a. Buat repository di GitHub

Buat repo baru (publik atau privat, tapi GitHub Pages gratis mensyaratkan publik kecuali
akun GitHub Pro/Team/Enterprise) di https://github.com/new, **jangan** centang "Add README"
(supaya tidak konflik). Misalnya nama repo: `mushalla-al-amanah`.

### b. Push kode dari folder ini

```bash
git init
git add .
git commit -m "Initial commit: aplikasi Mushalla Al Amanah"
git branch -M main
git remote add origin https://github.com/<username-kamu>/<nama-repo>.git
git push -u origin main
```

### c. Tambahkan Secrets untuk GitHub Actions

Buka repo di GitHub → **Settings → Secrets and variables → Actions → New repository secret**,
tambahkan 2 secret ini (nilainya ada di file `.env.example`):

| Name                      | Value |
|---------------------------|-------|
| `VITE_SUPABASE_URL`       | `https://ndbykvluzqvvmyjriwop.supabase.co` |
| `VITE_SUPABASE_ANON_KEY`  | (anon public key — lihat `.env.example`) |

> Anon key ini **aman** dipasang di frontend/publik — akses data tetap dibatasi oleh
> Row Level Security (RLS) yang sudah diatur di `supabase/schema.sql`.

Opsional, untuk fitur deteksi otomatis Live YouTube di Jadwal Kajian, tambahkan juga
`VITE_YOUTUBE_API_KEY` dan `VITE_YOUTUBE_CHANNEL_ID` — lihat `supabase/SETUP.md` bagian
"Live YouTube otomatis" untuk cara mendapatkannya.

### d. Aktifkan GitHub Pages

Buka **Settings → Pages** → bagian **Build and deployment** → **Source**, pilih
**GitHub Actions** (bukan "Deploy from a branch").

### e. Deploy

Workflow di `.github/workflows/deploy.yml` akan otomatis jalan setiap kali kamu push ke
branch `main` (build project lalu publish ke GitHub Pages). Untuk deploy pertama kali,
cukup push seperti langkah (b) di atas, lalu cek tab **Actions** di repo untuk memantau
prosesnya. Setelah selesai (centang hijau), situs bisa diakses di:

```
https://<username-kamu>.github.io/<nama-repo>/
```

### f. Update Redirect URL di Supabase

Setelah tahu URL final GitHub Pages di atas, **kembali ke Supabase → Authentication →
URL Configuration** dan update **Site URL** serta **Redirect URLs** sesuai URL tersebut
(lihat `supabase/SETUP.md` bagian 2). Ini penting supaya link konfirmasi email mengarah
ke tempat yang benar.

---

## 4. Struktur Fitur

- **Landing page** (`/`): widget "Bahan Bacaan" (5 artikel terbaru, auto-scroll) di
  paling atas, jadwal shalat otomatis (API, lokasi Denpasar), jadwal kajian, info
  infaq, link sosmed, tombol daftar/masuk.
- **Tentang** (`/tentang`): profil mushalla (dikelola admin).
- **Laporan Keuangan** (`/keuangan`): transparan untuk publik, dikelola oleh bendahara.
- **Bacaan** (`/bacaan`): artikel dari jamaah, tayang setelah disetujui admin, dengan
  paginasi (10 artikel/halaman). Menulis artikel (`/bacaan/tulis`) memerlukan akun
  yang sudah **diverifikasi** admin -- isinya bisa diformat (bold/italic/underline)
  lewat editor bawaan. Penulis (atau admin) bisa mengubah artikelnya lagi kapan pun
  lewat tombol "Ubah" (`/bacaan/edit/:id`) -- kalau yang mengubah bukan admin dan
  artikelnya sudah terbit, statusnya otomatis balik ke "Menunggu Review".
- **Dashboard** (`/dashboard`, perlu login + role):
  - **Verifikasi User** (admin): approve/reject jamaah baru, atur role.
  - **Moderasi Artikel** (admin): setujui/tolak/ubah artikel.
  - **Keuangan** (admin/bendahara): catat pemasukan & pengeluaran.
  - **Inventaris** (admin/inventaris): catat aset mushalla.
  - **Pengaturan Konten** (admin): jadwal kajian, info infaq, sosmed, tentang mushalla,
    override jadwal shalat.

## 5. Catatan

- Situs ini **client-side saja** (SPA) — semua akses data langsung dari browser ke
  Supabase, diamankan lewat Row Level Security. Tidak ada server backend terpisah.
- GitHub Pages dipakai sebagai hosting **sementara**; jika nanti perlu domain sendiri,
  tinggal arahkan DNS custom domain ke GitHub Pages (Settings → Pages → Custom domain),
  atau pindahkan `dist/` hasil `npm run build` ke hosting lain.
