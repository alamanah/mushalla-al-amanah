-- =====================================================================
-- Migrasi 004: foto profil (avatar) untuk halaman Profil/Pengaturan Akun
-- Jalankan di: Supabase Dashboard > SQL Editor > New query
-- =====================================================================

alter table public.profiles add column if not exists avatar_url text;

-- foto profil: siapa saja yang login (approved atau belum) boleh unggah/ubah/hapus
-- foto profilnya sendiri, disimpan di bucket "media" pada path "avatars/{user_id}/...".
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
-- SELESAI. Setelah ini pengguna bisa mengunggah foto profil lewat
-- halaman Profil (menu nama di kanan atas dashboard, atau /profil).
-- =====================================================================
