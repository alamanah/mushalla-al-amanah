export const NAMA_BULAN = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

/** Kunci bulan "YYYY-MM" dari sebuah tanggal "YYYY-MM-DD". */
export function bulanKeyDari(tanggal: string): string {
  return tanggal.slice(0, 7);
}

/** Kunci bulan berjalan (bulan saat ini), format "YYYY-MM". */
export function bulanKeySekarang(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Ubah kunci "YYYY-MM" jadi label "September 2026". */
export function labelBulan(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return `${NAMA_BULAN[m - 1]} ${y}`;
}

/** Daftar opsi bulan (urut menaik) dari kumpulan tanggal yang ada -- selalu
 * menyertakan bulan berjalan walau belum ada datanya. Dipakai untuk dropdown
 * filter bulan di card Jadwal Kajian & Jadwal Khatib Jumat di beranda. */
export function bulanOptionsDari(tanggals: (string | null | undefined)[]): string[] {
  const set = new Set<string>([bulanKeySekarang()]);
  tanggals.forEach((t) => {
    if (t) set.add(bulanKeyDari(t));
  });
  return Array.from(set).sort();
}
