-- Migrasi 9: lengkapi Jadwal Kajian (foto pamflet, log & status Live YouTube)
-- + izinkan humas membaca daftar Ustadz (untuk dropdown di form Jadwal Kajian).
-- Aman dijalankan berkali-kali.

alter table public.kajian_schedule add column if not exists foto_url text;
alter table public.kajian_schedule add column if not exists live_video_id text;
alter table public.kajian_schedule add column if not exists live_by_name text;
alter table public.kajian_schedule add column if not exists live_started_at timestamptz;

drop policy if exists "ustadz_humas_read" on public.ustadz;
create policy "ustadz_humas_read" on public.ustadz for select
  using (public.is_admin(auth.uid()) or public.has_role(auth.uid(), 'humas'));
