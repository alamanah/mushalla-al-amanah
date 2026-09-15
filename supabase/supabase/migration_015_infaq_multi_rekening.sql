-- Migrasi 15: Infaq & Shadaqah kini bisa punya lebih dari 1 rekening bank.
-- Sebelumnya bank_name/account_number/account_holder cuma 1 baris kolom
-- tunggal di infaq_info. Dipindah ke tabel terpisah infaq_rekening (banyak
-- baris, bisa ditambah/dihapus dari Dashboard > Pengaturan Konten > Info
-- Infaq). Rekening yang sudah ada otomatis dipindahkan supaya tidak hilang.
-- Aman dijalankan berkali-kali.

create table if not exists public.infaq_rekening (
  id uuid primary key default gen_random_uuid(),
  bank_name text not null,
  account_number text not null,
  account_holder text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.infaq_rekening enable row level security;

-- konten publik: siapa saja boleh baca; admin ATAU humas boleh tulis
drop policy if exists "infaq_rekening_public_read" on public.infaq_rekening;
create policy "infaq_rekening_public_read" on public.infaq_rekening for select using (true);

drop policy if exists "infaq_rekening_admin_humas_write" on public.infaq_rekening;
create policy "infaq_rekening_admin_humas_write" on public.infaq_rekening for all
  using (public.is_admin(auth.uid()) or public.has_role(auth.uid(), 'humas'))
  with check (public.is_admin(auth.uid()) or public.has_role(auth.uid(), 'humas'));

-- Pindahkan rekening lama (kalau ada & tabel baru masih kosong) supaya data
-- yang sudah diisi pengurus sebelumnya tidak hilang.
insert into public.infaq_rekening (bank_name, account_number, account_holder, sort_order)
select bank_name, account_number, account_holder, 0
from public.infaq_info
where bank_name is not null
  and account_number is not null
  and not exists (select 1 from public.infaq_rekening);

alter table public.infaq_info drop column if exists bank_name;
alter table public.infaq_info drop column if exists account_number;
alter table public.infaq_info drop column if exists account_holder;
