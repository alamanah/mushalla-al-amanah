-- =====================================================================
-- Migrasi 021: Tambah field Nama Bank & No. Rekening di Referensi Ustadz
--
-- Supaya bendahara/admin bisa langsung lihat rekening ustadz (untuk
-- transfer honor/bisyaroh) tanpa perlu cari catatan terpisah.
--
-- Aman dijalankan berkali-kali (idempotent) & tidak mempengaruhi data
-- ustadz yang sudah ada (kolom baru nullable, otomatis kosong utk data lama).
-- Jalankan file ini SEKALIGUS (satu kali Run) di Supabase Dashboard > SQL
-- Editor.
-- =====================================================================

alter table public.ustadz add column if not exists bank_name text;
alter table public.ustadz add column if not exists account_number text;
