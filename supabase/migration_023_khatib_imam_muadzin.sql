-- Migrasi 23: field nama Imam & Muadzin di jadwal Khatib Jumat -- dipakai
-- untuk mengisi Laporan Jumat otomatis (Dashboard > Keuangan > tab Laporan >
-- tombol "Buat Laporan Jumat"), selain Khotib yang sudah ada sebelumnya.
-- Opsional (boleh kosong, misalnya kalau belum ditentukan saat jadwal dibuat).
-- Aman dijalankan berkali-kali.

alter table public.khatib_jumat_schedule add column if not exists imam text;
alter table public.khatib_jumat_schedule add column if not exists muadzin text;
