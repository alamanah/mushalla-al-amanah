-- =====================================================================
-- Migrasi 024: Sinkron OTOMATIS saat EDIT baris jurnal ganda (lanjutan
-- Migrasi 020, yang baru menangani kasus HAPUS)
--
-- Latar belakang: seperti dijelaskan di Migrasi 020, 1 transaksi "asli"
-- sering dipecah jadi 2-3 baris di tabel BERBEDA yang berbagi
-- `jurnal_group_id` yang sama (mis. Jenis "BRI/BSI" -> tabel_bank +
-- tabel_up_bank, SAMA PERSIS; atau Kriteria "Setor UP Tunai" -> 1 baris di
-- tabel_bank + 1 baris KONTRA di tabel_up_tunai, nominal dibalik). Migrasi
-- 020 sudah menangani kasus HAPUS (hapus 1 baris ikut menghapus
-- pasangannya). Tapi kalau baris itu di-EDIT (mis. perbaiki Tanggal,
-- Periode, Kriteria, atau Keterangan yang salah ketik -- lewat tombol
-- "Sunting" di Dashboard > Keuangan, ATAU langsung lewat SQL Editor),
-- pasangannya di tabel lain TIDAK ikut berubah -- bikin data antar tabel
-- jadi tidak sinkron/membingungkan (mis. tabel_bank sudah betul Periode-nya
-- tapi tabel_up_bank masih yang lama).
--
-- Migrasi ini menambah trigger AFTER UPDATE yang otomatis menyamakan ke
-- semua baris pasangan (jurnal_group_id yang sama, di tabel manapun):
--   - Tanggal, Periode, Keterangan -> SELALU disamakan apa adanya (field
--     ini memang selalu identik di 1 kelompok jurnal, lihat `base` di
--     buildJurnalRows, tabelKeuangan.ts).
--   - Kriteria, Jenis -> HANYA disamakan ke baris pasangan yang SEBELUM
--     edit ini kebetulan nilainya PERSIS SAMA juga (berarti memang
--     dimaksudkan ikut berubah bersama, seperti tabel_bank<->tabel_up_bank
--     yang Jenis & Kriteria-nya selalu identik). Baris kontra yang SENGAJA
--     beda Jenis (mis. tabel_up_tunai yang Jenis-nya selalu "UP Tunai"
--     walau baris bank aslinya "BRI") atau beda Kriteria (mis. talangan
--     Buka Puasa yang 2 barisnya sengaja beda Kriteria) TIDAK ikut
--     disamakan -- supaya tidak merusak kombinasi yang memang disengaja.
--
-- Debet/Kredit SENGAJA tidak disentuh sama sekali oleh trigger ini --
-- aplikasi saat ini tidak punya form utk mengedit nominal transaksi yang
-- sudah tersimpan (cuma Tanggal/Jenis/Periode/Kriteria/Keterangan, lihat
-- FinancePage.tsx), dan baris kontra butuh nominal yang DIBALIK (bukan
-- sama persis) jadi tidak aman disamakan otomatis tanpa tahu arahnya.
--
-- Aman dari perulangan tak berhenti: begitu baris pasangan sudah sama
-- persis, UPDATE berikutnya tidak menyentuh baris apa pun (klausa WHERE-nya
-- mensyaratkan nilainya MASIH beda), jadi trigger-nya sendiri tidak
-- terpicu lagi -- persis seperti mekanisme berhenti sendiri di Migrasi 020.
--
-- Jalankan file ini SEKALIGUS (satu kali Run) di Supabase Dashboard > SQL
-- Editor. Aman dijalankan berkali-kali (idempotent).
-- =====================================================================

create or replace function public.sinkron_kelompok_jurnal() returns trigger as $$
declare
  tbl text;
begin
  if new.jurnal_group_id is null then
    return new;
  end if;

  if new.tanggal is distinct from old.tanggal
     or new.keterangan is distinct from old.keterangan
     or new.periode is distinct from old.periode
     or new.kriteria is distinct from old.kriteria
     or new.jenis is distinct from old.jenis
  then
    foreach tbl in array array[
      'tabel_bank', 'tabel_up_tunai', 'tabel_infaq_buka_puasa',
      'tabel_donasi', 'tabel_ramadhan', 'tabel_qurban', 'tabel_up_bank'
    ]
    loop
      -- Tanggal/Keterangan/Periode: selalu identik di 1 kelompok, aman
      -- disamakan tanpa syarat ke semua baris pasangan.
      execute format(
        'update public.%I set tanggal = $1, keterangan = $2, periode = $3
           where jurnal_group_id = $4 and id <> $5
             and (tanggal is distinct from $1 or keterangan is distinct from $2 or periode is distinct from $3)',
        tbl
      ) using new.tanggal, new.keterangan, new.periode, new.jurnal_group_id, new.id;

      -- Kriteria: cuma disamakan ke pasangan yang SEBELUM edit ini kriteria-nya
      -- juga persis sama (lihat catatan panjang di atas).
      execute format(
        'update public.%I set kriteria = $1
           where jurnal_group_id = $2 and id <> $3 and kriteria = $4 and kriteria is distinct from $1',
        tbl
      ) using new.kriteria, new.jurnal_group_id, new.id, old.kriteria;

      -- Jenis: sama, cuma disamakan ke pasangan yang sebelumnya jenis-nya
      -- juga persis sama (mis. tabel_bank <-> tabel_up_bank).
      execute format(
        'update public.%I set jenis = $1
           where jurnal_group_id = $2 and id <> $3 and jenis = $4 and jenis is distinct from $1',
        tbl
      ) using new.jenis, new.jurnal_group_id, new.id, old.jenis;
    end loop;
  end if;

  return new;
end;
$$ language plpgsql;

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'tabel_bank', 'tabel_up_tunai', 'tabel_infaq_buka_puasa',
    'tabel_donasi', 'tabel_ramadhan', 'tabel_qurban', 'tabel_up_bank'
  ]
  loop
    execute format('drop trigger if exists sinkron_kelompok_jurnal_trigger on public.%I', tbl);
    execute format(
      'create trigger sinkron_kelompok_jurnal_trigger after update on public.%I for each row execute function public.sinkron_kelompok_jurnal()',
      tbl
    );
  end loop;
end $$;
