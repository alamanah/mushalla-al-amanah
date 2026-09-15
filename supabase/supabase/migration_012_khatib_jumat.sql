-- Migrasi 12: Jadwal Khatib Jumat (tanggal, nama ustadz, link YouTube) +
-- fitur Live YouTube yang sama persis dengan Jadwal Kajian (live_video_id/
-- live_by_name/live_started_at). Data hanya bisa dikelola oleh admin/humas,
-- sama seperti kajian_schedule. Aman dijalankan berkali-kali.

create table if not exists public.khatib_jumat_schedule (
  id uuid primary key default gen_random_uuid(),
  tanggal date not null,
  nama_ustadz text not null,
  link_youtube text,
  live_video_id text, -- ID video YouTube yang sedang live (auto terdeteksi via YouTube Data API)
  live_by_name text, -- nama user humas yang terakhir menekan tombol "Mulai Live"
  live_started_at timestamptz, -- jam terakhir tombol "Mulai Live" ditekan
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.khatib_jumat_schedule enable row level security;

-- konten publik: siapa saja boleh baca; admin ATAU humas boleh tulis
drop policy if exists "khatib_public_read" on public.khatib_jumat_schedule;
create policy "khatib_public_read" on public.khatib_jumat_schedule for select using (true);

drop policy if exists "khatib_admin_humas_write" on public.khatib_jumat_schedule;
create policy "khatib_admin_humas_write" on public.khatib_jumat_schedule for all
  using (public.is_admin(auth.uid()) or public.has_role(auth.uid(), 'humas'))
  with check (public.is_admin(auth.uid()) or public.has_role(auth.uid(), 'humas'));
