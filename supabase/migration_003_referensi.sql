-- =====================================================================
-- Migrasi 003: Halaman "Referensi" (daftar Ustadz)
-- Jalankan seluruh file ini di: Supabase Dashboard > SQL Editor > New query
-- Aman dijalankan berkali-kali (idempotent).
-- =====================================================================

create table if not exists public.ustadz (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  kontak text,
  bidang text,
  keterangan text,
  created_at timestamptz not null default now()
);

alter table public.ustadz enable row level security;

-- Khusus halaman dashboard admin (bukan konsumsi publik).
drop policy if exists "ustadz_admin_all" on public.ustadz;
create policy "ustadz_admin_all" on public.ustadz for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));
