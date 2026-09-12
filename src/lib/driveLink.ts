/** Ubah link "Bagikan" Google Drive yang umum (mis.
 * https://drive.google.com/file/d/FILE_ID/view?usp=sharing) menjadi URL
 * gambar langsung yang bisa dipakai di <img src>. Kalau formatnya tidak
 * dikenali, link dikembalikan apa adanya (asumsi sudah berupa URL gambar
 * langsung, mis. dari layanan lain). File di Google Drive-nya harus
 * dibagikan dengan akses "Siapa saja yang memiliki link" supaya bisa tampil.
 *
 * Pakai endpoint "thumbnail" (bukan "uc?export=view") -- format lama itu
 * sering gagal tampil (ikon gambar rusak/kosong) karena belakangan ini
 * kerap ditolak Google untuk dipasang di website lain (hotlink), sedangkan
 * endpoint thumbnail jauh lebih stabil untuk kebutuhan ini. `sz=w1000`
 * minta ukuran lebar maksimal 1000px, cukup tajam untuk pamflet.
 */
export function driveImageUrl(link: string | null | undefined): string | null {
  if (!link) return null;
  const trimmed = link.trim();
  if (!trimmed) return null;
  const fileId = trimmed.match(/\/file\/d\/([^/]+)/)?.[1] ?? trimmed.match(/[?&]id=([^&]+)/)?.[1];
  if (fileId) return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
  return trimmed;
}
