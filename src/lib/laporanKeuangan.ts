import { FinancialKriteria, FinancialTransaction } from "../types";
import { computeRunningSaldo } from "./saldo";

/** Kriteria yang dikelola di tab tersendiri (Qurban/Donasi/Ramadhan/Buka Puasa)
 * dan TIDAK masuk ke perhitungan Laporan Keuangan mingguan (dana khusus, di
 * luar kas umum). */
export const KRITERIA_QURBAN: FinancialKriteria[] = ["Qurban", "Dana Pengqurban"];
export const KRITERIA_DONASI: FinancialKriteria[] = ["Donasi"];
export const KRITERIA_RAMADHAN: FinancialKriteria[] = ["Ramadhan"];
export const KRITERIA_BUKA_PUASA: FinancialKriteria[] = ["Infaq Buka Puasa"];

/** Buka Puasa itu khusus: selain Kriteria "Infaq Buka Puasa", transaksi APAPUN
 * krtterianya tapi Keterangan-nya menyebut "Buka Puasa" tetap dianggap masuk
 * tab/dana Buka Puasa (mis. dicatat manual dengan kriteria "Lainnya" tapi
 * keterangan "Infaq Buka Puasa RT 05"). */
export function isBukaPuasa(t: Pick<FinancialTransaction, "kriteria" | "keterangan">): boolean {
  if (KRITERIA_BUKA_PUASA.includes(t.kriteria)) return true;
  return (t.keterangan ?? "").toLowerCase().includes("buka puasa");
}

const EXCLUDED_KRITERIA_DARI_LAPORAN: FinancialKriteria[] = [
  ...KRITERIA_QURBAN,
  ...KRITERIA_DONASI,
  ...KRITERIA_RAMADHAN,
  ...KRITERIA_BUKA_PUASA,
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
}

/**
 * Bangun laporan keuangan mingguan untuk satu `periode` (mis. "Pekan 37"),
 * digabung dari SEMUA jenis rekening (BRI, BSI, UP Tunai).
 *
 * - Data Qurban/Donasi/Ramadhan/Buka Puasa dikeluarkan sepenuhnya dari perhitungan.
 * - Saldo Awal periode = saldo berjalan tepat SEBELUM transaksi pertama
 *   (non "Saldo Awal") pada periode ini -- otomatis ikut menghitung baris
 *   "Saldo Awal" rekening (BRI/BSI/UP Tunai) kalau itu yang mendahuluinya.
 */
export function buildLaporanKeuangan(allItems: FinancialTransaction[], periode: string): LaporanKeuanganResult {
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
