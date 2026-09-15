-- Migrasi 18: tambah kolom nama tampilan (mis. "@al_amanah_dps") untuk tiap
-- tautan media sosial, supaya bisa tampil beda dari nama platform-nya
-- (sebelumnya cuma menampilkan "Instagram", "Facebook", dst). Aman
-- dijalankan berkali-kali.

alter table public.social_links add column if not exists display_name text;
