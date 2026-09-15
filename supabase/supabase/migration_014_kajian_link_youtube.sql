-- Migrasi 14: tambah kolom link_youtube di kajian_schedule -- sama seperti
-- yang sudah ada di khatib_jumat_schedule, supaya pengurus bisa menempel
-- link YouTube manual (mis. link premiere/rekaman terjadwal) untuk jadwal
-- kajian, di luar deteksi live otomatis (live_video_id). Aman dijalankan
-- berkali-kali.

alter table public.kajian_schedule add column if not exists link_youtube text;
