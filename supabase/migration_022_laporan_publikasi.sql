-- =====================================================================
-- Migrasi 022: Publikasi Laporan Keuangan mingguan ke halaman publik
--
-- Latar belakang: pekan yang MASIH BERJALAN datanya bisa berubah kapan saja
-- (transaksi masih terus ditambah/dikoreksi bendahara sepanjang pekan itu),
-- jadi kalau ditampilkan otomatis ke publik bisa bikin bingung/salah paham.
--
-- Sekarang laporan di halaman publik (menu "Keuangan"/"/keuangan") DEFAULT
-- menampilkan PEKAN SEBELUMNYA (Pekan N-1) yang datanya sudah final. Pekan
-- berjalan (Pekan N) baru ikut tampil ke publik SETELAH bendahara menekan
-- tombol "Publikasikan" di Dashboard > Keuangan > tab Laporan (menandakan
-- pekan itu sudah selesai direkap & dicocokkan).
--
-- Tabel ini cuma catatan "periode mana saja yang sudah dipublikasikan" --
-- TIDAK menyimpan salinan data laporan (laporan tetap dihitung LIVE dari
-- data transaksi asli seperti biasa, cuma ditampilkan/tidaknya ke publik
-- yang diatur lewat tabel ini).
--
-- Jalankan file ini SEKALIGUS (satu kali Run) di Supabase Dashboard > SQL
-- Editor. Aman dijalankan berkali-kali (idempotent).
-- =====================================================================

create table if not exists public.laporan_publikasi (
  periode text primary key,
  published_at timestamptz not null default now(),
  published_by uuid references public.profiles (id) on delete set null
);

alter table public.laporan_publikasi enable row level security;

-- Siapa saja boleh baca (dipakai halaman publik utk cek status publikasi),
-- HANYA bendahara boleh menambah/menghapus (publikasikan/batalkan).
drop policy if exists "laporan_publikasi_public_read" on public.laporan_publikasi;
create policy "laporan_publikasi_public_read" on public.laporan_publikasi for select using (true);

drop policy if exists "laporan_publikasi_write_bendahara" on public.laporan_publikasi;
create policy "laporan_publikasi_write_bendahara" on public.laporan_publikasi for all
  using (public.has_role(auth.uid(), 'bendahara'))
  with check (public.has_role(auth.uid(), 'bendahara'));
