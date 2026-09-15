-- Migrasi 16: tambah Alamat & link Google Maps ke profil mushalla
-- (about_content) -- ditampilkan di halaman "Tentang" dan footer. Peta
-- ditampilkan otomatis (embed) dari teks alamat, tanpa perlu API key
-- Google. Aman dijalankan berkali-kali.

alter table public.about_content add column if not exists address text;
alter table public.about_content add column if not exists maps_url text;
