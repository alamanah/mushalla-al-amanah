-- =====================================================================
-- Migrasi 010: Tambah Kriteria "Setor/Terima UM Ramadhan" & "Setor/Terima
-- UM Qurban", hapus Kriteria "Dana Pengqurban"
--
-- PostgreSQL tidak bisa menghapus satu nilai enum secara langsung, jadi
-- caranya: bikin tipe enum baru berisi daftar akhir yang diinginkan (sudah
-- termasuk 4 kriteria baru, tanpa "Dana Pengqurban"), lalu pindahkan kolom
-- `kriteria` ke tipe baru itu, baru hapus tipe lama.
--
-- Transaksi yang selama ini memakai Kriteria "Dana Pengqurban" DIPINDAHKAN
-- ke Kriteria "Qurban" (paling dekat maknanya & tidak ikut dihapus) supaya
-- tidak ada data yang hilang. Kalau ternyata Anda mau baris-baris lama itu
-- dipindah ke kriteria lain (mis. "Setor UM Qurban"), beri tahu saya dulu
-- sebelum menjalankan migrasi ini -- lewat dashboard, kriteria setiap baris
-- bisa dikoreksi satu-satu lewat tombol Sunting kapan saja.
--
-- Jalankan file ini SEKALIGUS (satu kali Run) di Supabase Dashboard > SQL
-- Editor. Aman dijalankan berkali-kali (idempotent).
-- =====================================================================

do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    where t.typname = 'financial_kriteria' and e.enumlabel = 'Dana Pengqurban'
  ) then
    -- Migrasi ini sudah pernah dijalankan sebelumnya (kriteria "Dana
    -- Pengqurban" sudah tidak ada) -- tidak perlu diulang.
    raise notice 'Migrasi 010 sudah pernah dijalankan, dilewati.';
    return;
  end if;

  -- 1. Pindahkan data lama yang masih pakai "Dana Pengqurban" ke "Qurban".
  update public.financial_transactions
    set kriteria = 'Qurban'
    where kriteria = 'Dana Pengqurban';

  -- 2. Bikin tipe enum baru dengan daftar kriteria akhir yang diinginkan.
  create type financial_kriteria_new as enum (
    'Saldo Awal', 'Transfer', 'Setor Tunai Jumat', 'QRIS', 'Admin', 'Gaji',
    'Kegiatan Dakwah', 'Kegiatan Sosial', 'Kegiatan Sarpras', 'Lainnya',
    'Ramadhan', 'Qurban', 'Donasi', 'Infaq Buka Puasa',
    'Setor UP Tunai', 'Terima UP Tunai',
    'Setor UM Ramadhan', 'Terima UM Ramadhan',
    'Setor UM Qurban', 'Terima UM Qurban'
  );

  -- 3. Pindahkan kolom `kriteria` ke tipe baru.
  alter table public.financial_transactions
    alter column kriteria type financial_kriteria_new
    using kriteria::text::financial_kriteria_new;

  -- 4. Buang tipe lama, ganti nama tipe baru jadi nama aslinya.
  drop type financial_kriteria;
  alter type financial_kriteria_new rename to financial_kriteria;
end $$;
