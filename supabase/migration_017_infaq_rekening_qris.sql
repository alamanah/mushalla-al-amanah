-- Migrasi 17: tiap rekening bank Infaq & Shadaqah bisa punya gambar QRIS
-- sendiri (sebelumnya QRIS cuma 1 gambar umum di infaq_info, dipakai
-- bersama untuk semua rekening). Aman dijalankan berkali-kali.

alter table public.infaq_rekening add column if not exists qris_url text;
