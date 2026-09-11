import { FinancialTransaction } from "../types";

/** Daftar Periode unik dari data yang ada, diurutkan menurun berdasarkan
 * angka "Pekan N" -- dipakai utk isi <datalist> saran di input Periode. */
export function listPeriodeOptions(items: FinancialTransaction[]): string[] {
  const set = new Set(items.map((t) => t.periode).filter((p): p is string => !!p));
  return Array.from(set).sort((a, b) => {
    const na = Number(a.match(/\d+/)?.[0]);
    const nb = Number(b.match(/\d+/)?.[0]);
    if (!Number.isNaN(na) && !Number.isNaN(nb) && na !== nb) return nb - na;
    return b.localeCompare(a);
  });
}

/** Tebak Periode berikutnya berdasarkan angka "Pekan N" TERTINGGI yang ada
 * di data -- dipakai sebagai nilai awal (default) form input Periode supaya
 * bendahara tidak perlu mengetik ulang / menghitung sendiri tiap minggu.
 * Kalau belum ada data sama sekali (atau tidak ada yang berpola "Pekan N"),
 * baliknya "Pekan 1". */
export function suggestNextPeriode(items: FinancialTransaction[]): string {
  let max = 0;
  for (const t of items) {
    const n = Number(t.periode?.match(/\d+/)?.[0]);
    if (!Number.isNaN(n) && n > max) max = n;
  }
  return `Pekan ${max + 1}`;
}

/** Daftar Keterangan unik dari data yang ada, TERBARU dulu (berdasarkan
 * created_at) -- dipakai utk isi <datalist> saran di input Keterangan,
 * supaya bendahara tinggal pilih dari yang pernah dipakai sebelumnya
 * (mis. "Infaq Jumat", "Kegiatan Dakwah RT 05", dst) daripada ngetik ulang. */
export function listKeteranganOptions(items: FinancialTransaction[], max = 300): string[] {
  const sorted = [...items].sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of sorted) {
    const k = (t.keterangan ?? "").trim();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(k);
    if (out.length >= max) break;
  }
  return out;
}
