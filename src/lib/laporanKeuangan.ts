import { FinancialKriteria, FinancialTransaction } from "../types";
import { computeRunningSaldo } from "./saldo";

/** Kriteria yang dikelola di tab tersendiri (Qurban/Donasi/Ramadhan/Buka Puasa)
 * dan TIDAK masuk ke perhitungan Laporan Keuangan mingguan (dana khusus, di
 * luar kas umum). */
export const KRITERIA_QURBAN: FinancialKriteria[] = ["Qurban", "Setor UM Qurban", "Terima UM Qurban"];
export const KRITERIA_DONASI: FinancialKriteria[] = ["Donasi"];
export const KRITERIA_RAMADHAN: FinancialKriteria[] = ["Ramadhan", "Setor UM Ramadhan", "Terima UM Ramadhan"];
export const KRITERIA_BUKA_PUASA: FinancialKriteria[] = ["Infaq Buka Puasa"];
/** Mutasi internal antar kantong (bank <-> kas tunai) -- bukan penerimaan/
 * pengeluaran sungguhan, jadi tidak ikut dihitung di Laporan Keuangan supaya
 * tidak dobel/salah arah waktu tabel_up_bank & tabel_up_tunai digabung. */
export const KRITERIA_TRANSFER_UP_TUNAI: FinancialKriteria[] = ["Setor UP Tunai", "Terima UP Tunai"];

/** Transaksi dianggap dana Buka Puasa HANYA berdasarkan Kriteria "Infaq Buka
 * Puasa" (sejak Migrasi 011 dana ini punya tabelnya sendiri). Sebelumnya
 * fungsi ini juga mencocokkan teks "buka puasa" di Keterangan, tapi itu
 * salah menangkap transaksi lain yang sekadar menyebut kata itu di
 * keterangan (mis. Kriteria "Kegiatan Dakwah" dengan keterangan "Kebutuhan
 * buka puasa Jumat Berkah") sehingga tidak ikut terhitung di Laporan. */
export function isBukaPuasa(t: Pick<FinancialTransaction, "kriteria" | "keterangan">): boolean {
  return KRITERIA_BUKA_PUASA.includes(t.kriteria);
}

const EXCLUDED_KRITERIA_DARI_LAPORAN: FinancialKriteria[] = [
  ...KRITERIA_QURBAN,
  ...KRITERIA_DONASI,
  ...KRITERIA_RAMADHAN,
  ...KRITERIA_BUKA_PUASA,
  ...KRITERIA_TRANSFER_UP_TUNAI,
];

/** Kriteria yang ditampilkan sebagai baris Penerimaan/Pengeluaran di Laporan Keuangan
 * (meniru format laporan mingguan yang sudah dipakai pengurus di Google Sheets). */
const KRITERIA_PENERIMAAN: FinancialKriteria[] = ["Transfer", "Setor Tunai Jumat", "QRIS", "Admin", "Lainnya"];
const KRITERIA_PENGELUARAN: FinancialKriteria[] = [
  "Gaji",
  "Kegiatan Dakwah",
  "Kegiatan Sosial",
  "Kegiatan Sarpras",
  "Lainnya",
  "Admin",
];

export interface LaporanBarisKriteria {
  kriteria: FinancialKriteria;
  jumlah: number;
  keterangan: string;
}

export interface LaporanKeuanganResult {
  periode: string;
  tahun: number;
  saldoAwal: number;
  penerimaan: LaporanBarisKriteria[];
  totalPenerimaan: number;
  pengeluaran: LaporanBarisKriteria[];
  totalPengeluaran: number;
  saldoAkhir: number;
  tanggalTerakhir: string | null;
  adaData: boolean;
  /** Total Infaq Buka Puasa periode ini (dana khusus, di luar hitungan Saldo
   * Awal/Akhir di atas) -- ditampilkan sebagai info tambahan di laporan. */
  totalBukaPuasa: number;
}

/**
 * Bangun laporan keuangan mingguan untuk satu `periode` (mis. "Pekan 37").
 *
 * `allItems` HARUS gabungan tabel_up_bank + tabel_up_tunai (kas operasional
 * gabungan BRI+BSI+Tunai, lihat FinancePage.tsx) -- BUKAN tabel_bank, supaya
 * dana khusus (Qurban/Donasi/Ramadhan) tidak ikut lewat baris "sesuai csv"
 * yang masih ada di tabel_bank.
 *
 * - Data Qurban/Donasi/Ramadhan/Buka Puasa dikeluarkan sepenuhnya dari perhitungan.
 * - Kriteria "Setor/Terima UP Tunai" (mutasi internal bank<->tunai) juga
 *   dikeluarkan -- itu cuma perpindahan antar kantong, bukan penerimaan/
 *   pengeluaran sungguhan.
 * - Saldo Awal periode = saldo berjalan tepat SEBELUM transaksi pertama
 *   (non "Saldo Awal") pada periode ini -- otomatis ikut menjumlahkan baris
 *   "Saldo Awal" BRI + BSI + UP Tunai (dari tabel_up_bank & tabel_up_tunai)
 *   kalau itu yang mendahuluinya.
 */
export function buildLaporanKeuangan(
  allItems: FinancialTransaction[],
  periode: string,
  /** Sumber data untuk total Infaq Buka Puasa (default: tabel_infaq_buka_puasa
   * -- lihat FinancePage.tsx). Terpisah dari `allItems` karena dana Buka
   * Puasa dicatat di tabelnya sendiri. */
  bukaPuasaItems: FinancialTransaction[] = allItems
): LaporanKeuanganResult {
  const reportable = allItems.filter(
    (t) => !EXCLUDED_KRITERIA_DARI_LAPORAN.includes(t.kriteria) && !isBukaPuasa(t)
  );
  const runningRows = computeRunningSaldo(reportable);

  const idxFirst = runningRows.findIndex((r) => r.periode === periode && r.kriteria !== "Saldo Awal");
  const rowsPeriode = runningRows.filter((r) => r.periode === periode && r.kriteria !== "Saldo Awal");
  const saldoAwal = idxFirst > 0 ? runningRows[idxFirst - 1].saldo : 0;

  const buildRows = (list: FinancialKriteria[], field: "debet" | "kredit"): LaporanBarisKriteria[] =>
    list.map((k) => {
      const matches = rowsPeriode.filter((r) => r.kriteria === k);
      const jumlah = matches.reduce((sum, r) => sum + Number(r[field]), 0);
      const keterangan = Array.from(new Set(matches.map((r) => r.keterangan).filter((v): v is string => !!v))).join(
        ", "
      );
      return { kriteria: k, jumlah, keterangan };
    });

  const penerimaan = buildRows(KRITERIA_PENERIMAAN, "debet");
  const pengeluaran = buildRows(KRITERIA_PENGELUARAN, "kredit");
  const totalPenerimaan = penerimaan.reduce((a, b) => a + b.jumlah, 0);
  const totalPengeluaran = pengeluaran.reduce((a, b) => a + b.jumlah, 0);
  const saldoAkhir = saldoAwal + totalPenerimaan - totalPengeluaran;

  const tanggalTerakhir = rowsPeriode.reduce<string | null>((latest, r) => {
    if (!r.tanggal) return latest;
    if (!latest || r.tanggal > latest) return r.tanggal;
    return latest;
  }, null);
  const tahun = tanggalTerakhir ? new Date(tanggalTerakhir).getFullYear() : new Date().getFullYear();

  const totalBukaPuasa = bukaPuasaItems
    .filter((t) => t.periode === periode && isBukaPuasa(t))
    .reduce((sum, t) => sum + Number(t.debet) - Number(t.kredit), 0);

  return {
    periode,
    tahun,
    saldoAwal,
    penerimaan,
    totalPenerimaan,
    pengeluaran,
    totalPengeluaran,
    saldoAkhir,
    tanggalTerakhir,
    adaData: rowsPeriode.length > 0,
    totalBukaPuasa,
  };
}

/** Daftar periode unik dari data, diurutkan menurun berdasarkan angka "Pekan N". */
export function listPeriodeOptions(items: FinancialTransaction[]): string[] {
  const set = new Set(items.map((t) => t.periode));
  return Array.from(set).sort((a, b) => {
    const na = Number(a.match(/\d+/)?.[0]);
    const nb = Number(b.match(/\d+/)?.[0]);
    if (!Number.isNaN(na) && !Number.isNaN(nb) && na !== nb) return nb - na;
    return b.localeCompare(a);
  });
}
