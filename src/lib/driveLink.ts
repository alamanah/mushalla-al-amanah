/** Ubah link "Bagikan" Google Drive yang umum (mis.
 * https://drive.google.com/file/d/FILE_ID/view?usp=sharing) menjadi URL
 * gambar langsung yang bisa dipakai di <img src>. Kalau formatnya tidak
 * dikenali, link dikembalikan apa adanya (asumsi sudah berupa URL gambar
 * langsung, mis. dari layanan lain). File di Google Drive-nya harus
 * dibagikan dengan akses "Siapa saja yang memiliki link" supaya bisa tampil.
 */
export function driveImageUrl(link: string | null | undefined): string | null {
  if (!link) return null;
  const trimmed = link.trim();
  if (!trimmed) return null;
  const fileId = trimmed.match(/\/file\/d\/([^/]+)/)?.[1] ?? trimmed.match(/[?&]id=([^&]+)/)?.[1];
  if (fileId) return `https://drive.google.com/uc?export=view&id=${fileId}`;
  return trimmed;
}
