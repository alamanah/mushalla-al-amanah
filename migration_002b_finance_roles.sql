-- =====================================================================
-- MIGRASI 002b — jalankan SETELAH migration_002a_enum.sql sukses duluan
-- (di query/Run terpisah).
--
-- Isi migrasi ini:
--  1. Struktur baru financial_transactions: periode, uraian, kriteria,
--     debet, kredit, jenis (BRI/BSI/UP Tunai). Kolom lama (kategori,
--     jumlah, jenis masuk/keluar) dimigrasi ke kolom baru lalu dihapus.
--     Saldo TIDAK disimpan — dihitung dinamis di aplikasi.
--  2. Admin jadi read-only untuk Keuangan & Inventaris (hanya
--     bendahara/inventaris yang boleh input/ubah/hapus).
--  3. Role "humas" dapat mengelola konten publik (jadwal kajian, infaq,
--     sosmed, tentang mushalla, override jadwal shalat) — sebelumnya
--     admin-only.
--  4. Admin bisa menghapus user (profil aplikasi).
--  5. Menghapus user tidak lagi ikut menghapus artikel yang ditulisnya.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. ENUM BARU untuk transaksi keuangan
-- ---------------------------------------------------------------------
do $$ begin
  create type financial_jenis as enum ('BRI', 'BSI', 'UP Tunai');
exception when duplicate_object then null; end $$;

do $$ begin
  create type financial_kriteria as enum (
    'Saldo Awal', 'Transfer', 'Setor Tunai Jumat', 'QRIS', 'Admin', 'Gaji',
    'Kegiatan Dakwah', 'Kegiatan Sosial', 'Kegiatan Sarpras', 'Lainnya',
    'Ramadhan', 'Dana Pengqurban', 'Qurban', 'Donasi'
  );
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- 2. RESTRUKTUR TABEL financial_transactions
-- ---------------------------------------------------------------------
alter table public.financial_transactions
  alter column tanggal type timestamptz using tanggal::timestamptz,
  alter column tanggal drop not null;

alter table public.financial_transactions rename column jenis to jenis_lama;
alter table public.financial_transactions rename column deskripsi to keterangan;

alter table public.financial_transactions
  add column if not exists periode text,
  add column if not exists uraian text,
  add column if not exists jenis financial_jenis,
  add column if not exists kriteria financial_kriteria,
  add column if not exists debet numeric(14, 2) not null default 0,
  add column if not exists kredit numeric(14, 2) not null default 0;

-- migrasi data lama: jumlah + jenis_lama (masuk/keluar) -> debet/kredit
update public.financial_transactions
set debet = case when jenis_lama = 'masuk' then jumlah else 0 end,
    kredit = case when jenis_lama = 'keluar' then jumlah else 0 end
where jenis_lama is not null;

-- migrasi kategori (teks bebas) -> kriteria (enum), pencocokan best-effort
update public.financial_transactions
set kriteria = (case
  when kategori ilike 'saldo awal' then 'Saldo Awal'
  when kategori ilike 'transfer' then 'Transfer'
  when kategori ilike '%setor%tunai%jumat%' then 'Setor Tunai Jumat'
  when kategori ilike 'qris' then 'QRIS'
  when kategori ilike 'admin' then 'Admin'
  when kategori ilike 'gaji' then 'Gaji'
  when kategori ilike '%dakwah%' then 'Kegiatan Dakwah'
  when kategori ilike '%sosial%' then 'Kegiatan Sosial'
  when kategori ilike '%sarpras%' then 'Kegiatan Sarpras'
  when kategori ilike 'ramadhan' then 'Ramadhan'
  when kategori ilike '%pengqurban%' then 'Dana Pengqurban'
  when kategori ilike 'qurban' then 'Qurban'
  when kategori ilike 'donasi' then 'Donasi'
  else 'Lainnya'
end)::financial_kriteria
where kategori is not null;

-- data lama tidak tercatat rekening BRI/BSI/UP Tunai yang mana -> default
-- UP Tunai (silakan koreksi manual lewat Dashboard > Keuangan bila perlu)
update public.financial_transactions set jenis = 'UP Tunai' where jenis is null;
update public.financial_transactions set kriteria = 'Lainnya' where kriteria is null;
update public.financial_transactions set periode = 'Pekan 1' where periode is null;

-- bersihkan kolom lama
alter table public.financial_transactions
  drop column jenis_lama,
  drop column kategori,
  drop column jumlah;

alter table public.financial_transactions
  alter column jenis set not null,
  alter column kriteria set not null,
  alter column periode set not null;

comment on column public.financial_transactions.debet is 'Uang MASUK (dari perspektif kas mushalla)';
comment on column public.financial_transactions.kredit is 'Uang KELUAR (dari perspektif kas mushalla)';
comment on column public.financial_transactions.uraian is 'Deskripsi mentah asli dari rekening koran (arsip, tidak diedit)';
comment on column public.financial_transactions.keterangan is 'Keterangan yang sudah disunting/disesuaikan bendahara';

-- ---------------------------------------------------------------------
-- 3. RLS: keuangan & inventaris — hanya role terkait yang boleh menulis;
--    admin (dan publik, untuk keuangan) tetap bisa MELIHAT saja lewat
--    kebijakan select yang sudah ada sebelumnya.
-- ---------------------------------------------------------------------
drop policy if exists "finance_write_bendahara_admin" on public.financial_transactions;
create policy "finance_write_bendahara" on public.financial_transactions for all
  using (public.has_role(auth.uid(), 'bendahara'))
  with check (public.has_role(auth.uid(), 'bendahara'));

drop policy if exists "inventory_write_inventaris_admin" on public.inventory_items;
create policy "inventory_write_inventaris" on public.inventory_items for all
  using (public.has_role(auth.uid(), 'inventaris'))
  with check (public.has_role(auth.uid(), 'inventaris'));

-- ---------------------------------------------------------------------
-- 4. RLS: konten publik sekarang bisa dikelola admin ATAU humas
-- ---------------------------------------------------------------------
drop policy if exists "kajian_admin_write" on public.kajian_schedule;
create policy "kajian_admin_humas_write" on public.kajian_schedule for all
  using (public.is_admin(auth.uid()) or public.has_role(auth.uid(), 'humas'))
  with check (public.is_admin(auth.uid()) or public.has_role(auth.uid(), 'humas'));

drop policy if exists "prayer_override_admin_write" on public.prayer_schedule_override;
create policy "prayer_override_admin_humas_write" on public.prayer_schedule_override for all
  using (public.is_admin(auth.uid()) or public.has_role(auth.uid(), 'humas'))
  with check (public.is_admin(auth.uid()) or public.has_role(auth.uid(), 'humas'));

drop policy if exists "infaq_admin_write" on public.infaq_info;
create policy "infaq_admin_humas_write" on public.infaq_info for all
  using (public.is_admin(auth.uid()) or public.has_role(auth.uid(), 'humas'))
  with check (public.is_admin(auth.uid()) or public.has_role(auth.uid(), 'humas'));

drop policy if exists "social_admin_write" on public.social_links;
create policy "social_admin_humas_write" on public.social_links for all
  using (public.is_admin(auth.uid()) or public.has_role(auth.uid(), 'humas'))
  with check (public.is_admin(auth.uid()) or public.has_role(auth.uid(), 'humas'));

drop policy if exists "about_admin_write" on public.about_content;
create policy "about_admin_humas_write" on public.about_content for all
  using (public.is_admin(auth.uid()) or public.has_role(auth.uid(), 'humas'))
  with check (public.is_admin(auth.uid()) or public.has_role(auth.uid(), 'humas'));

-- ---------------------------------------------------------------------
-- 5. Admin bisa menghapus user (profil aplikasi + role-nya ikut terhapus
--    lewat cascade). CATATAN: ini TIDAK menghapus akun login Supabase
--    Auth-nya (butuh service role key / Dashboard > Authentication >
--    Users untuk itu) — orangnya masih bisa login tapi tanpa profil,
--    jadi otomatis diperlakukan sebagai belum terverifikasi.
-- ---------------------------------------------------------------------
drop policy if exists "profiles_delete_admin" on public.profiles;
create policy "profiles_delete_admin" on public.profiles for delete
  using (public.is_admin(auth.uid()));

-- ---------------------------------------------------------------------
-- 6. Supaya hapus user tidak ikut menghapus artikel yang sudah
--    ditulisnya (nama penulis tetap tersimpan terpisah di author_name)
-- ---------------------------------------------------------------------
alter table public.articles alter column author_id drop not null;
alter table public.articles drop constraint if exists articles_author_id_fkey;
alter table public.articles
  add constraint articles_author_id_fkey
  foreign key (author_id) references public.profiles (id) on delete set null;

-- =====================================================================
-- SELESAI.
-- =====================================================================
