-- =====================================================================
-- Migrasi 005: struktur baru Inventaris (Kode Barang otomatis per
-- kategori, Nilai, Tahun Perolehan, riwayat Hibah/Hapus)
-- Jalankan di: Supabase Dashboard > SQL Editor > New query
-- =====================================================================

-- 1. Kategori barang -- kode dipakai sebagai awalan Kode Barang
--    (mis. "1000.0001"). last_seq HANYA bertambah, termasuk saat barang
--    dihibahkan/dihapus, supaya Kode Barang tidak pernah dipakai ulang.
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

-- 2. Fungsi ambil Kode Barang berikutnya secara atomik.
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

-- 3. Ubah struktur inventory_items ke kolom baru.
alter table public.inventory_items add column if not exists kode_barang text;
alter table public.inventory_items add column if not exists kategori_kode text;
alter table public.inventory_items add column if not exists nilai numeric(14, 2) not null default 0;
alter table public.inventory_items add column if not exists tahun_perolehan int;
alter table public.inventory_items add column if not exists created_by_name text;

-- Backfill data lama (kalau ada): semua barang lama dipetakan ke kategori
-- "Barang Lainnya" (9000) dan diberi Kode Barang baru secara berurutan --
-- silakan cek & koreksi manual Kategori-nya lewat Dashboard > Inventaris
-- setelah migrasi ini selesai.
update public.inventory_items
set kategori_kode = '9000'
where kategori_kode is null;

update public.inventory_items
set tahun_perolehan = extract(year from tanggal_perolehan)::int
where tahun_perolehan is null and tanggal_perolehan is not null;

do $$
declare
  r record;
begin
  for r in select id from public.inventory_items where kode_barang is null order by created_at, id loop
    update public.inventory_items
    set kode_barang = public.next_inventory_code('9000')
    where id = r.id;
  end loop;
end $$;

alter table public.inventory_items alter column kategori_kode set not null;
alter table public.inventory_items alter column kode_barang set not null;

do $$ begin
  alter table public.inventory_items add constraint inventory_items_kode_barang_key unique (kode_barang);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.inventory_items
    add constraint inventory_items_kategori_kode_fkey
    foreign key (kategori_kode) references public.inventory_categories (kode);
exception when duplicate_object then null; end $$;

alter table public.inventory_items drop column if exists kategori;
alter table public.inventory_items drop column if exists tanggal_perolehan;
alter table public.inventory_items drop column if exists catatan;

-- 4. Riwayat barang yang dihibahkan/dihapus.
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
  hibah_kepada text,
  alasan_hapus text,
  tanggal date not null default current_date,
  keterangan text,
  foto_url text,
  created_by uuid references public.profiles (id) on delete set null,
  created_by_name text,
  created_at timestamptz not null default now()
);

-- 5. RLS
alter table public.inventory_categories enable row level security;
alter table public.inventory_disposals enable row level security;

drop policy if exists "inventory_categories_read_inventaris_admin" on public.inventory_categories;
create policy "inventory_categories_read_inventaris_admin" on public.inventory_categories for select
  using (public.is_admin(auth.uid()) or public.has_role(auth.uid(), 'inventaris'));

drop policy if exists "inventory_disposals_read_inventaris_admin" on public.inventory_disposals;
create policy "inventory_disposals_read_inventaris_admin" on public.inventory_disposals for select
  using (public.is_admin(auth.uid()) or public.has_role(auth.uid(), 'inventaris'));
drop policy if exists "inventory_disposals_write_inventaris" on public.inventory_disposals;
create policy "inventory_disposals_write_inventaris" on public.inventory_disposals for insert
  with check (public.has_role(auth.uid(), 'inventaris'));

-- =====================================================================
-- SELESAI. Setelah ini buka Dashboard > Inventaris -- barang lama akan
-- muncul dengan Kode Barang baru berkategori "Barang Lainnya" (9000),
-- silakan koreksi Kategori-nya satu per satu kalau perlu (klik Ubah).
-- =====================================================================
