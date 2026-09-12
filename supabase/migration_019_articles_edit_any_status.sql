-- Migrasi 19: izinkan penulis artikel mengubah artikelnya sendiri kapan pun
-- (sebelumnya cuma bisa diubah selama masih draft/menunggu/ditolak -- begitu
-- terbit, penulis non-admin tidak bisa mengedit lagi). Sekarang penulis
-- boleh mengubah artikel yang sudah terbit juga, TAPI tidak boleh langsung
-- membuatnya tetap berstatus "published" lewat update sendiri (harus lewat
-- aplikasi, yang otomatis mengembalikan status ke "pending" saat penulis
-- non-admin mengubah artikel yang sudah terbit) -- jadi perubahan isi tetap
-- dicek ulang admin sebelum tampil lagi ke publik. Admin sendiri tetap bisa
-- mengubah apa saja lewat policy "articles_admin_all" yang sudah ada.
-- Aman dijalankan berkali-kali.

drop policy if exists "articles_update_own_unpublished" on public.articles;
drop policy if exists "articles_update_own" on public.articles;
create policy "articles_update_own" on public.articles for update
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id and status <> 'published');
