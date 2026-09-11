-- =====================================================================
-- Skema Database: Mushalla Al Amanah GKN I Denpasar
-- Jalankan seluruh file ini di: Supabase Dashboard > SQL Editor > New query
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- 1. ENUM TYPES
-- ---------------------------------------------------------------------
do $$ begin
  create type user_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type app_role as enum ('admin', 'bendahara', 'inventaris', 'humas');
exception when duplicate_object then null; end $$;

do $$ begin
  create type article_status as enum ('draft', 'pending', 'published', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type financial_jenis as enum ('BRI', 'BSI', 'UP Tunai', 'Infaq Buka Puasa');
exception when duplicate_object then null; end $$;

do $$ begin
  create type financial_kriteria as enum (
    'Saldo Awal', 'Transfer', 'Setor Tunai Jumat', 'QRIS', 'Admin', 'Gaji',
    'Kegiatan Dakwah', 'Kegiatan Sosial', 'Kegiatan Sarpras', 'Lainnya',
    'Ramadhan', 'Qurban', 'Donasi', 'Infaq Buka Puasa',
    'Setor UP Tunai', 'Terima UP Tunai',
    'Setor UM Ramadhan', 'Terima UM Ramadhan',
    'Setor UM Qurban', 'Terima UM Qurban'
  );
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- 2. TABEL PROFIL & ROLE USER
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  phone text,
  avatar_url text,
  status user_status not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

-- ---------------------------------------------------------------------
-- 3. TABEL KONTEN PUBLIK
-- ---------------------------------------------------------------------
create table if not exists public.kajian_schedule (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  ustadz text,
  day_of_week int check (day_of_week between 0 and 6), -- 0=Minggu .. 6=Sabtu
  specific_date date,
  time_text text not null,
  location text,
  description text,
  foto_url text, -- gambar pamflet kajian, ditampilkan di beranda
  live_video_id text, -- ID video YouTube yang sedang live (auto terdeteksi via YouTube Data API)
  live_by_name text, -- nama user humas yang terakhir menekan tombol "Mulai Live"
  live_started_at timestamptz, -- jam terakhir tombol "Mulai Live" ditekan
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.prayer_schedule_override (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  subuh text,
  dzuhur text,
  ashar text,
  maghrib text,
  isya text,
  jumat text,
  note text
);

create table if not exists public.infaq_info (
  id uuid primary key default gen_random_uuid(),
  bank_name text,
  account_number text,
  account_holder text,
  ewallet_name text,
  ewallet_number text,
  qr_image_url text,
  description text
);

create table if not exists public.social_links (
  id uuid primary key default gen_random_uuid(),
  platform text not null,
  url text not null,
  is_active boolean not null default true,
  sort_order int not null default 0
);

create table if not exists public.about_content (
  id uuid primary key default gen_random_uuid(),
  content text not null default '',
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 4. KEUANGAN & INVENTARIS
-- ---------------------------------------------------------------------
-- Saldo TIDAK disimpan di sini -- dihitung dinamis di aplikasi per Jenis
-- rekening, diurutkan berdasarkan tanggal: saldo_n = (saldo_(n-1) + debet_n) - kredit_n
create table if not exists public.financial_transactions (
  id uuid primary key default gen_random_uuid(),
  tanggal timestamptz, -- null hanya untuk baris "Saldo Awal" tanpa tanggal spesifik
  periode text not null, -- mis. "Pekan 1", "Pekan 2", dst -- dipilih manual sebelum upload
  uraian text, -- deskripsi mentah asli dari rekening koran (arsip)
  kriteria financial_kriteria not null,
  debet numeric(14, 2) not null default 0, -- uang MASUK (perspektif kas mushalla)
  kredit numeric(14, 2) not null default 0, -- uang KELUAR (perspektif kas mushalla)
  keterangan text, -- keterangan yang sudah disunting bendahara
  jenis financial_jenis not null, -- BRI / BSI / UP Tunai
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

-- Kategori barang inventaris -- kode dipakai sebagai awalan Kode Barang
-- (mis. "1000.0001"). last_seq HANYA bertambah, tidak pernah berkurang --
-- termasuk saat barang dihibahkan/dihapus -- supaya Kode Barang tidak pernah
-- dipakai ulang (lihat fungsi next_inventory_code di bawah).
create table if not exists public.inventory_categories (
  kode text primary key,
  nama text not null,
  sort_order int not null default 0,
  last_seq int not null default 0
);

insert into public.inventory_categories (kode, nama, sort_order) values
  ('1000', 'Barang Perabot', 1),
  ('2000', 'Barang Elektronik', 2),
  ('3000', 'Barang Persediaan', 3),
  ('9000', 'Barang Lainnya', 4)
on conflict (kode) do nothing;

create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  kode_barang text not null unique,
  nama_barang text not null,
  kategori_kode text not null references public.inventory_categories (kode),
  jumlah int not null default 1,
  nilai numeric(14, 2) not null default 0,
  kondisi text,
  lokasi text,
  tahun_perolehan int,
  foto_url text, -- foto dokumentasi barang (opsional)
  created_by uuid references public.profiles (id) on delete set null,
  created_by_name text, -- snapshot nama pencatat saat itu (supaya tetap tampil walau lintas role)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Riwayat barang yang sudah dihibahkan/dihapus dari inventory_items --
-- disimpan permanen (bukan hard delete) supaya Kode Barang lama tetap
-- tercatat dan tidak bisa dipakai ulang, sekaligus jadi arsip dokumentasi.
create table if not exists public.inventory_disposals (
  id uuid primary key default gen_random_uuid(),
  kode_barang text not null,
  nama_barang text not null,
  kategori_kode text not null,
  jumlah int not null default 0,
  nilai numeric(14, 2) not null default 0,
  kondisi text,
  lokasi text,
  tahun_perolehan int,
  tipe text not null check (tipe in ('hibah', 'hapus')),
  hibah_kepada text, -- diisi kalau tipe = 'hibah'
  alasan_hapus text, -- diisi kalau tipe = 'hapus'
  tanggal date not null default current_date,
  keterangan text,
  foto_url text,
  created_by uuid references public.profiles (id) on delete set null,
  created_by_name text,
  created_at timestamptz not null default now()
);

-- Ambil Kode Barang berikutnya untuk sebuah kategori secara atomik (aman
-- dari race condition saat 2 pengguna input barang bersamaan).
create or replace function public.next_inventory_code(p_kategori_kode text)
returns text
language plpgsql
security definer set search_path = public
as $$
declare
  v_seq int;
begin
  update public.inventory_categories
  set last_seq = last_seq + 1
  where kode = p_kategori_kode
  returning last_seq into v_seq;

  if v_seq is null then
    raise exception 'Kategori inventaris tidak ditemukan: %', p_kategori_kode;
  end if;

  return p_kategori_kode || '.' || lpad(v_seq::text, 4, '0');
end;
$$;

grant execute on function public.next_inventory_code(text) to authenticated;

-- ---------------------------------------------------------------------
-- 4b. REFERENSI (daftar ustadz -- untuk rujukan internal pengurus)
-- ---------------------------------------------------------------------
create table if not exists public.ustadz (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  kontak text,
  bidang text,
  keterangan text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 5. ARTIKEL / BACAAN
-- ---------------------------------------------------------------------
create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  content text not null,
  cover_image_url text,
  author_id uuid references public.profiles (id) on delete set null,
  author_name text,
  status article_status not null default 'pending',
  rejection_note text,
  published_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 6. TRIGGER: buat baris profiles otomatis saat user baru mendaftar
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, phone, status)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'phone',
    'pending'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- 7. HELPER FUNCTIONS (SECURITY DEFINER, dipakai di RLS policy)
-- ---------------------------------------------------------------------
create or replace function public.is_admin(uid uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.user_roles where user_id = uid and role = 'admin'
  );
$$;

create or replace function public.has_role(uid uuid, r app_role)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.user_roles where user_id = uid and role = r
  );
$$;

-- ---------------------------------------------------------------------
-- 8. ROW LEVEL SECURITY
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.kajian_schedule enable row level security;
alter table public.prayer_schedule_override enable row level security;
alter table public.infaq_info enable row level security;
alter table public.social_links enable row level security;
alter table public.about_content enable row level security;
alter table public.financial_transactions enable row level security;
alter table public.inventory_categories enable row level security;
alter table public.inventory_items enable row level security;
alter table public.inventory_disposals enable row level security;
alter table public.articles enable row level security;
alter table public.ustadz enable row level security;

-- profiles: user lihat/ubah profil sendiri; admin lihat/ubah semua
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin" on public.profiles
  for select using (auth.uid() = id or public.is_admin(auth.uid()));

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin" on public.profiles
  for update using (public.is_admin(auth.uid()));

-- admin bisa menghapus user (profil aplikasi + role ikut terhapus lewat
-- cascade). CATATAN: ini TIDAK menghapus akun login Supabase Auth-nya
-- (perlu service role key / Dashboard > Authentication > Users untuk itu).
drop policy if exists "profiles_delete_admin" on public.profiles;
create policy "profiles_delete_admin" on public.profiles
  for delete using (public.is_admin(auth.uid()));

-- Cegah user biasa mengubah status verifikasinya sendiri (mis. lewat panggilan API
-- langsung). Hanya admin yang boleh mengubah kolom status; user biasa yang
-- meng-update profilnya (nama/HP) tidak akan bisa menyelundupkan perubahan status.
create or replace function public.prevent_self_status_change()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  -- auth.uid() kosong berarti query dijalankan langsung (SQL Editor, migrasi,
  -- service role) di luar konteks user login lewat API -- konteks ini sudah
  -- dipercaya (hanya admin/dev yang punya akses SQL Editor), jadi dibiarkan.
  -- Yang diblokir hanya user biasa yang login lewat aplikasi tapi bukan admin.
  if auth.uid() is not null and not public.is_admin(auth.uid()) then
    new.status := old.status;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_self_status_change on public.profiles;
create trigger trg_prevent_self_status_change
  before update on public.profiles
  for each row execute function public.prevent_self_status_change();

-- user_roles: user lihat role sendiri; admin kelola semua
drop policy if exists "user_roles_select_own_or_admin" on public.user_roles;
create policy "user_roles_select_own_or_admin" on public.user_roles
  for select using (auth.uid() = user_id or public.is_admin(auth.uid()));

drop policy if exists "user_roles_admin_write" on public.user_roles;
create policy "user_roles_admin_write" on public.user_roles
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- konten publik: siapa saja boleh baca; admin ATAU humas boleh tulis
drop policy if exists "kajian_public_read" on public.kajian_schedule;
create policy "kajian_public_read" on public.kajian_schedule for select using (true);
drop policy if exists "kajian_admin_write" on public.kajian_schedule;
drop policy if exists "kajian_admin_humas_write" on public.kajian_schedule;
create policy "kajian_admin_humas_write" on public.kajian_schedule for all
  using (public.is_admin(auth.uid()) or public.has_role(auth.uid(), 'humas'))
  with check (public.is_admin(auth.uid()) or public.has_role(auth.uid(), 'humas'));

drop policy if exists "prayer_override_public_read" on public.prayer_schedule_override;
create policy "prayer_override_public_read" on public.prayer_schedule_override for select using (true);
drop policy if exists "prayer_override_admin_write" on public.prayer_schedule_override;
drop policy if exists "prayer_override_admin_humas_write" on public.prayer_schedule_override;
create policy "prayer_override_admin_humas_write" on public.prayer_schedule_override for all
  using (public.is_admin(auth.uid()) or public.has_role(auth.uid(), 'humas'))
  with check (public.is_admin(auth.uid()) or public.has_role(auth.uid(), 'humas'));

drop policy if exists "infaq_public_read" on public.infaq_info;
create policy "infaq_public_read" on public.infaq_info for select using (true);
drop policy if exists "infaq_admin_write" on public.infaq_info;
drop policy if exists "infaq_admin_humas_write" on public.infaq_info;
create policy "infaq_admin_humas_write" on public.infaq_info for all
  using (public.is_admin(auth.uid()) or public.has_role(auth.uid(), 'humas'))
  with check (public.is_admin(auth.uid()) or public.has_role(auth.uid(), 'humas'));

drop policy if exists "social_public_read" on public.social_links;
create policy "social_public_read" on public.social_links for select using (true);
drop policy if exists "social_admin_write" on public.social_links;
drop policy if exists "social_admin_humas_write" on public.social_links;
create policy "social_admin_humas_write" on public.social_links for all
  using (public.is_admin(auth.uid()) or public.has_role(auth.uid(), 'humas'))
  with check (public.is_admin(auth.uid()) or public.has_role(auth.uid(), 'humas'));

drop policy if exists "about_public_read" on public.about_content;
create policy "about_public_read" on public.about_content for select using (true);
drop policy if exists "about_admin_write" on public.about_content;
drop policy if exists "about_admin_humas_write" on public.about_content;
create policy "about_admin_humas_write" on public.about_content for all
  using (public.is_admin(auth.uid()) or public.has_role(auth.uid(), 'humas'))
  with check (public.is_admin(auth.uid()) or public.has_role(auth.uid(), 'humas'));

-- keuangan: transparan untuk publik (read termasuk admin); tulis HANYA bendahara
drop policy if exists "finance_public_read" on public.financial_transactions;
create policy "finance_public_read" on public.financial_transactions for select using (true);
drop policy if exists "finance_write_bendahara_admin" on public.financial_transactions;
drop policy if exists "finance_write_bendahara" on public.financial_transactions;
create policy "finance_write_bendahara" on public.financial_transactions for all
  using (public.has_role(auth.uid(), 'bendahara'))
  with check (public.has_role(auth.uid(), 'bendahara'));

-- inventaris: dibaca admin & inventaris (bukan konsumsi publik); tulis HANYA inventaris
drop policy if exists "inventory_categories_read_inventaris_admin" on public.inventory_categories;
create policy "inventory_categories_read_inventaris_admin" on public.inventory_categories for select
  using (public.is_admin(auth.uid()) or public.has_role(auth.uid(), 'inventaris'));

drop policy if exists "inventory_read_inventaris_admin" on public.inventory_items;
create policy "inventory_read_inventaris_admin" on public.inventory_items for select
  using (public.is_admin(auth.uid()) or public.has_role(auth.uid(), 'inventaris'));
drop policy if exists "inventory_write_inventaris_admin" on public.inventory_items;
drop policy if exists "inventory_write_inventaris" on public.inventory_items;
create policy "inventory_write_inventaris" on public.inventory_items for all
  using (public.has_role(auth.uid(), 'inventaris'))
  with check (public.has_role(auth.uid(), 'inventaris'));

drop policy if exists "inventory_disposals_read_inventaris_admin" on public.inventory_disposals;
create policy "inventory_disposals_read_inventaris_admin" on public.inventory_disposals for select
  using (public.is_admin(auth.uid()) or public.has_role(auth.uid(), 'inventaris'));
drop policy if exists "inventory_disposals_write_inventaris" on public.inventory_disposals;
create policy "inventory_disposals_write_inventaris" on public.inventory_disposals for insert
  with check (public.has_role(auth.uid(), 'inventaris'));

-- referensi ustadz: kelola (tambah/ubah/hapus) khusus admin; humas boleh baca
-- saja (dipakai untuk dropdown pilih Ustadz di Pengaturan Konten > Jadwal Kajian).
drop policy if exists "ustadz_admin_all" on public.ustadz;
create policy "ustadz_admin_all" on public.ustadz for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

drop policy if exists "ustadz_humas_read" on public.ustadz;
create policy "ustadz_humas_read" on public.ustadz for select
  using (public.is_admin(auth.uid()) or public.has_role(auth.uid(), 'humas'));

-- artikel: publik hanya lihat yang published; penulis lihat/kelola miliknya; admin kelola semua
drop policy if exists "articles_public_read_published" on public.articles;
create policy "articles_public_read_published" on public.articles for select
  using (status = 'published' or auth.uid() = author_id or public.is_admin(auth.uid()));

drop policy if exists "articles_insert_own_approved_user" on public.articles;
create policy "articles_insert_own_approved_user" on public.articles for insert
  with check (
    auth.uid() = author_id
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.status = 'approved')
  );

drop policy if exists "articles_update_own_unpublished" on public.articles;
create policy "articles_update_own_unpublished" on public.articles for update
  using (auth.uid() = author_id and status in ('draft', 'pending', 'rejected'))
  with check (auth.uid() = author_id);

drop policy if exists "articles_admin_all" on public.articles;
create policy "articles_admin_all" on public.articles for all
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

drop policy if exists "articles_delete_own" on public.articles;
create policy "articles_delete_own" on public.articles for delete
  using (auth.uid() = author_id or public.is_admin(auth.uid()));

-- ---------------------------------------------------------------------
-- 9. STORAGE BUCKET untuk gambar (sampul artikel, QRIS infaq, dll)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

drop policy if exists "media_public_read" on storage.objects;
create policy "media_public_read" on storage.objects for select
  using (bucket_id = 'media');

drop policy if exists "media_upload_approved_user" on storage.objects;
create policy "media_upload_approved_user" on storage.objects for insert
  with check (
    bucket_id = 'media'
    and auth.role() = 'authenticated'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.status = 'approved')
  );

drop policy if exists "media_manage_own_or_admin" on storage.objects;
create policy "media_manage_own_or_admin" on storage.objects for update
  using (bucket_id = 'media' and (owner = auth.uid() or public.is_admin(auth.uid())));

drop policy if exists "media_delete_own_or_admin" on storage.objects;
create policy "media_delete_own_or_admin" on storage.objects for delete
  using (bucket_id = 'media' and (owner = auth.uid() or public.is_admin(auth.uid())));

-- foto profil: siapa saja yang login (approved atau belum) boleh unggah/ubah/hapus
-- foto profilnya sendiri, disimpan di path "avatars/{user_id}/...".
drop policy if exists "avatars_insert_own" on storage.objects;
create policy "avatars_insert_own" on storage.objects for insert
  with check (
    bucket_id = 'media'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = 'avatars'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

drop policy if exists "avatars_update_own" on storage.objects;
create policy "avatars_update_own" on storage.objects for update
  using (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = 'avatars'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

drop policy if exists "avatars_delete_own" on storage.objects;
create policy "avatars_delete_own" on storage.objects for delete
  using (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = 'avatars'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

-- =====================================================================
-- SELESAI. Langkah selanjutnya: lihat SETUP.md untuk konfigurasi Auth
-- dan menjadikan akun pertama sebagai admin.
-- =====================================================================
