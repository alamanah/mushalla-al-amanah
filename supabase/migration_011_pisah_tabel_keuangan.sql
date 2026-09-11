-- =====================================================================
-- Migrasi 011: Pisah transaksi keuangan jadi 7 tabel per "kantong" dana
--
-- Tabel baru (field/kolom SAMA PERSIS dengan financial_transactions):
--   1. tabel_bank             -- rekening BRI & BSI (dibedakan kolom jenis)
--   2. tabel_up_tunai         -- kas tunai (UP Tunai)
--   3. tabel_infaq_buka_puasa -- dana Infaq Buka Puasa (aturan upload
--                                 belum dibuat, tabel disiapkan dulu)
--   4. tabel_donasi           -- dana Donasi
--   5. tabel_ramadhan         -- dana Ramadhan
--   6. tabel_qurban           -- dana Qurban
--   7. tabel_up_bank          -- salinan transaksi bank OPERASIONAL saja
--                                 (Kriteria umum: Transfer/QRIS/Admin/dst),
--                                 tanpa transaksi yang sifatnya transfer
--                                 antar kantong atau dana khusus
--
-- Ini TIDAK menghapus atau mengubah tabel financial_transactions yang
-- lama -- tabel itu tetap ada apa adanya (sudah Anda kosongkan sendiri).
--
-- Jalankan file ini SEKALIGUS (satu kali Run) di Supabase Dashboard > SQL
-- Editor. Aman dijalankan berkali-kali (idempotent).
-- =====================================================================

-- 1. Tambah nilai baru di enum financial_jenis (dipakai sebagai label
--    kolom `jenis` di tabel_donasi/tabel_ramadhan/tabel_qurban).
alter type financial_jenis add value if not exists 'Donasi';
alter type financial_jenis add value if not exists 'Ramadhan';
alter type financial_jenis add value if not exists 'Qurban';

-- 2. Bikin 7 tabel baru, struktur kolom sama persis dengan
--    financial_transactions.
create table if not exists public.tabel_bank (
  id uuid primary key default gen_random_uuid(),
  tanggal timestamptz,
  periode text not null,
  uraian text,
  kriteria financial_kriteria not null,
  debet numeric(14, 2) not null default 0,
  kredit numeric(14, 2) not null default 0,
  keterangan text,
  jenis financial_jenis not null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.tabel_up_tunai (
  id uuid primary key default gen_random_uuid(),
  tanggal timestamptz,
  periode text not null,
  uraian text,
  kriteria financial_kriteria not null,
  debet numeric(14, 2) not null default 0,
  kredit numeric(14, 2) not null default 0,
  keterangan text,
  jenis financial_jenis not null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.tabel_infaq_buka_puasa (
  id uuid primary key default gen_random_uuid(),
  tanggal timestamptz,
  periode text not null,
  uraian text,
  kriteria financial_kriteria not null,
  debet numeric(14, 2) not null default 0,
  kredit numeric(14, 2) not null default 0,
  keterangan text,
  jenis financial_jenis not null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.tabel_donasi (
  id uuid primary key default gen_random_uuid(),
  tanggal timestamptz,
  periode text not null,
  uraian text,
  kriteria financial_kriteria not null,
  debet numeric(14, 2) not null default 0,
  kredit numeric(14, 2) not null default 0,
  keterangan text,
  jenis financial_jenis not null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.tabel_ramadhan (
  id uuid primary key default gen_random_uuid(),
  tanggal timestamptz,
  periode text not null,
  uraian text,
  kriteria financial_kriteria not null,
  debet numeric(14, 2) not null default 0,
  kredit numeric(14, 2) not null default 0,
  keterangan text,
  jenis financial_jenis not null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.tabel_qurban (
  id uuid primary key default gen_random_uuid(),
  tanggal timestamptz,
  periode text not null,
  uraian text,
  kriteria financial_kriteria not null,
  debet numeric(14, 2) not null default 0,
  kredit numeric(14, 2) not null default 0,
  keterangan text,
  jenis financial_jenis not null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.tabel_up_bank (
  id uuid primary key default gen_random_uuid(),
  tanggal timestamptz,
  periode text not null,
  uraian text,
  kriteria financial_kriteria not null,
  debet numeric(14, 2) not null default 0,
  kredit numeric(14, 2) not null default 0,
  keterangan text,
  jenis financial_jenis not null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

-- 3. Row Level Security -- disamakan persis dengan financial_transactions:
--    siapa saja boleh baca (transparansi publik), HANYA bendahara boleh
--    tulis (insert/update/delete).
do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'tabel_bank', 'tabel_up_tunai', 'tabel_infaq_buka_puasa',
    'tabel_donasi', 'tabel_ramadhan', 'tabel_qurban', 'tabel_up_bank'
  ]
  loop
    execute format('alter table public.%I enable row level security', tbl);

    execute format('drop policy if exists "%s_public_read" on public.%I', tbl, tbl);
    execute format(
      'create policy "%s_public_read" on public.%I for select using (true)',
      tbl, tbl
    );

    execute format('drop policy if exists "%s_write_bendahara" on public.%I', tbl, tbl);
    execute format(
      'create policy "%s_write_bendahara" on public.%I for all using (public.has_role(auth.uid(), ''bendahara'')) with check (public.has_role(auth.uid(), ''bendahara''))',
      tbl, tbl
    );
  end loop;
end $$;
