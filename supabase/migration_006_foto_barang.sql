-- =====================================================================
-- Migrasi 006: foto dokumentasi barang inventaris
-- Jalankan di: Supabase Dashboard > SQL Editor > New query
-- =====================================================================

alter table public.inventory_items add column if not exists foto_url text;

-- =====================================================================
-- SELESAI. Tombol kamera di kolom Aksi halaman Dashboard > Inventaris
-- sekarang bisa dipakai untuk unggah/ganti foto barang.
-- =====================================================================
