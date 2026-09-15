-- =====================================================================
-- Migrasi 020: Korelasi baris jurnal ganda antar 7 tabel keuangan
--
-- Latar belakang: 1 transaksi "asli" (upload CSV rekening koran, input
-- manual, atau Rekam Transaksi cepat di HP) sering dipecah aplikasi jadi
-- 2-3 baris di tabel BERBEDA (mis. pilih Kriteria "Setor UP Tunai" ->
-- 1 baris di tabel_bank + 1 baris kontra di tabel_up_tunai; atau ganti
-- Jenis jadi "UP Tunai" di baris upload -> baris asal tetap di tabel_bank
-- + tabel_up_bank, ditambah 1 baris baru di tabel_up_tunai). Sebelum
-- migrasi ini, baris-baris itu SAMA SEKALI tidak "tahu" satu sama lain --
-- kalau salah satu dihapus manual, pasangannya di tabel lain tertinggal
-- begitu saja, bikin data antar tabel tidak sinkron (mis. tabel_bank
-- sudah bersih tapi tabel_up_tunai masih ada saldo hantu).
--
-- Migrasi ini menambah kolom `jurnal_group_id` (uuid) di ke-7 tabel --
-- SEMUA baris yang dihasilkan dari 1 transaksi yang sama (lihat
-- buildJurnalRows() di src/lib/tabelKeuangan.ts) diisi nilai groupId yang
-- SAMA oleh aplikasi. Lalu lewat trigger di bawah, MENGHAPUS satu baris
-- yang punya jurnal_group_id otomatis ikut MENGHAPUS semua baris lain
-- (di tabel manapun) yang groupId-nya sama -- baik dihapus lewat tombol
-- hapus satuan, hapus massal (checklist), maupun manual lewat SQL Editor.
--
-- Data LAMA (sebelum migrasi ini, jurnal_group_id-nya NULL) TIDAK
-- terpengaruh sama sekali -- trigger di bawah cuma jalan kalau baris yang
-- dihapus punya jurnal_group_id terisi, jadi baris lama tetap berperilaku
-- seperti biasa (hapus 1 baris, ya cuma baris itu saja yang hilang).
--
-- Jalankan file ini SEKALIGUS (satu kali Run) di Supabase Dashboard > SQL
-- Editor. Aman dijalankan berkali-kali (idempotent).
-- =====================================================================

-- 1. Tambah kolom `jurnal_group_id` (nullable) + index di ke-7 tabel.
do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'tabel_bank', 'tabel_up_tunai', 'tabel_infaq_buka_puasa',
    'tabel_donasi', 'tabel_ramadhan', 'tabel_qurban', 'tabel_up_bank'
  ]
  loop
    execute format('alter table public.%I add column if not exists jurnal_group_id uuid', tbl);
    execute format(
      'create index if not exists %I on public.%I (jurnal_group_id) where jurnal_group_id is not null',
      tbl || '_jurnal_group_id_idx', tbl
    );
  end loop;
end $$;

-- 2. Fungsi trigger -- kalau baris yang dihapus punya jurnal_group_id,
--    hapus juga semua baris LAIN (di tabel manapun, TERMASUK tabel yang
--    sama -- lihat catatan "Infaq Buka Puasa" di bawah) yang
--    jurnal_group_id-nya sama. SENGAJA tidak dikecualikan dari tabelnya
--    sendiri, supaya kasus seperti transfer talangan Buka Puasa (yang
--    menghasilkan 2 baris SEKALIGUS di tabel_infaq_buka_puasa dengan
--    groupId yang sama) tetap saling ikut terhapus kalau salah satunya
--    dihapus duluan.
--
--    Aman dari perulangan tak berhenti: baris yang dihapus statement ini
--    (kalau memang masih ada) akan memicu trigger-nya sendiri lagi, tapi
--    begitu semua baris dengan groupId tsb di SEMUA tabel sudah habis,
--    setiap DELETE berikutnya cuma kena 0 baris -- row-level trigger
--    Postgres cuma terpicu untuk baris yang BENAR-BENAR terhapus, jadi
--    rantai pemicu ini otomatis berhenti sendiri (dan karena 1 kelompok
--    paling banyak cuma berisi beberapa baris, rantainya sangat pendek).
create or replace function public.hapus_kelompok_jurnal() returns trigger as $$
begin
  if old.jurnal_group_id is not null then
    delete from public.tabel_bank where jurnal_group_id = old.jurnal_group_id;
    delete from public.tabel_up_tunai where jurnal_group_id = old.jurnal_group_id;
    delete from public.tabel_infaq_buka_puasa where jurnal_group_id = old.jurnal_group_id;
    delete from public.tabel_donasi where jurnal_group_id = old.jurnal_group_id;
    delete from public.tabel_ramadhan where jurnal_group_id = old.jurnal_group_id;
    delete from public.tabel_qurban where jurnal_group_id = old.jurnal_group_id;
    delete from public.tabel_up_bank where jurnal_group_id = old.jurnal_group_id;
  end if;
  return old;
end;
$$ language plpgsql;

-- 3. Pasang trigger AFTER DELETE di ke-7 tabel yang sama.
do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'tabel_bank', 'tabel_up_tunai', 'tabel_infaq_buka_puasa',
    'tabel_donasi', 'tabel_ramadhan', 'tabel_qurban', 'tabel_up_bank'
  ]
  loop
    execute format('drop trigger if exists hapus_kelompok_jurnal_trigger on public.%I', tbl);
    execute format(
      'create trigger hapus_kelompok_jurnal_trigger after delete on public.%I for each row execute function public.hapus_kelompok_jurnal()',
      tbl
    );
  end loop;
end $$;
