-- Migrasi 13: field status konfirmasi kehadiran khatib di jadwal Khatib
-- Jumat -- defaultnya "Belum Dikonfirmasi", diubah manual jadi "Terkonfirmasi"
-- lewat tombol aksi di Dashboard > Pengaturan Konten > Jadwal Khatib Jumat.
-- Aman dijalankan berkali-kali.

alter table public.khatib_jumat_schedule add column if not exists is_confirmed boolean not null default false;
