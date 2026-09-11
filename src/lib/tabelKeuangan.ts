import { DraftTransaction, FinancialJenis, FinancialKriteria } from "../types";

/**
 * Nama 7 tabel keuangan baru (Migrasi 011) -- pengganti `financial_transactions`.
 * Upload CSV (BRI/BSI), input manual, Rekam Saldo Awal, dan tab dashboard
 * (BRI/BSI/UP Tunai/Buka Puasa/Donasi/Ramadhan/Qurban/Laporan) semuanya
 * membaca & menulis ke tabel-tabel ini.
 */
export const TABEL_BANK = "tabel_bank";
export const TABEL_UP_TUNAI = "tabel_up_tunai";
export const TABEL_INFAQ_BUKA_PUASA = "tabel_infaq_buka_puasa";
export const TABEL_DONASI = "tabel_donasi";
export const TABEL_RAMADHAN = "tabel_ramadhan";
export const TABEL_QURBAN = "tabel_qurban";
export const TABEL_UP_BANK = "tabel_up_bank";

// Rule b: Setor/Terima UP Tunai -- tabel_bank sesuai csv, tabel_up_tunai kontra.
const KRITERIA_UP_TUNAI: FinancialKriteria[] = ["Setor UP Tunai", "Terima UP Tunai"];
// Rule c: Donasi -- tabel_bank & tabel_donasi sesuai csv (bukan kontra).
const KRITERIA_DONASI: FinancialKriteria[] = ["Donasi"];
// Rule d: Ramadhan (langsung) -- tabel_bank & tabel_ramadhan sesuai csv (bukan kontra).
const KRITERIA_RAMADHAN_LANGSUNG: FinancialKriteria[] = ["Ramadhan"];
// Rule e: Setor/Terima UM Ramadhan -- tabel_bank sesuai csv, tabel_ramadhan kontra.
const KRITERIA_RAMADHAN_UM: FinancialKriteria[] = ["Setor UM Ramadhan", "Terima UM Ramadhan"];
// Rule f: Qurban (langsung) -- tabel_bank & tabel_qurban sesuai csv (bukan kontra).
const KRITERIA_QURBAN_LANGSUNG: FinancialKriteria[] = ["Qurban"];
// Rule g: Setor/Terima UM Qurban -- tabel_bank sesuai csv, tabel_qurban kontra.
const KRITERIA_QURBAN_UM: FinancialKriteria[] = ["Setor UM Qurban", "Terima UM Qurban"];
// Rule a (default, sisanya): Transfer/Setor Tunai Jumat/QRIS/Admin/Gaji/Kegiatan
// Dakwah/Kegiatan Sosial/Kegiatan Sarpras/Lainnya/Saldo Awal -- tabel_bank &
// tabel_up_bank sesuai csv (salinan persis, BUKAN kontra).

export interface JurnalRowInsert {
  tanggal: string | null;
  periode: string;
  uraian: string | null;
  kriteria: FinancialKriteria;
  debet: number;
  kredit: number;
  keterangan: string | null;
  jenis: FinancialJenis;
  created_by: string | null;
}

export interface JurnalRow {
  table: string;
  row: JurnalRowInsert;
}

export interface JurnalContext {
  tanggalIso: string | null;
  periode: string;
  createdBy: string | null;
}

/**
 * Bangun baris jurnal (bisa 1 atau 2 baris, ke tabel berbeda) untuk satu baris
 * draft hasil upload CSV, sesuai aturan a-g yang sudah ditentukan.
 */
export function buildJurnalRows(draft: DraftTransaction, ctx: JurnalContext): JurnalRow[] {
  const base = {
    tanggal: ctx.tanggalIso,
    periode: ctx.periode,
    uraian: draft.uraian || null,
    keterangan: draft.keterangan || null,
    created_by: ctx.createdBy,
  };
  const asli: JurnalRowInsert = {
    ...base,
    kriteria: draft.kriteria,
    debet: draft.debet,
    kredit: draft.kredit,
    jenis: draft.jenis,
  };
  // Kontra: nominal Debet<->Kredit ditukar, kriteria & tanggal/uraian sama.
  const kontraNilai = { debet: draft.kredit, kredit: draft.debet };

  // Jenis BUKAN rekening bank (dipilih langsung, baik dari input manual /
  // Rekam Saldo Awal maupun trigger manual di draft upload) -- ini transaksi
  // yang terjadi langsung di "kantong" dana itu sendiri (bukan lewat bank),
  // jadi cukup 1 baris ke tabel kantongnya masing-masing, tanpa jurnal ganda.
  const TABEL_LANGSUNG: Partial<Record<FinancialJenis, string>> = {
    "UP Tunai": TABEL_UP_TUNAI,
    "Infaq Buka Puasa": TABEL_INFAQ_BUKA_PUASA,
    Donasi: TABEL_DONASI,
    Ramadhan: TABEL_RAMADHAN,
    Qurban: TABEL_QURBAN,
  };
  if (TABEL_LANGSUNG[draft.jenis]) {
    return [{ table: TABEL_LANGSUNG[draft.jenis]!, row: asli }];
  }

  // Kriteria "Infaq Buka Puasa" dipilih manual pada baris Jenis BRI/BSI --
  // logika jurnal gandanya masih dirancang sendiri oleh bendahara, jadi
  // untuk sementara langsung masuk tabel_infaq_buka_puasa saja (satu baris,
  // tanpa kontra ke tabel_bank).
  if (draft.kriteria === "Infaq Buka Puasa") {
    return [{ table: TABEL_INFAQ_BUKA_PUASA, row: asli }];
  }

  // Sisanya: baris rekening koran asli (Jenis BRI/BSI), rute sesuai Kriteria.
  if (KRITERIA_UP_TUNAI.includes(draft.kriteria)) {
    return [
      { table: TABEL_BANK, row: asli },
      { table: TABEL_UP_TUNAI, row: { ...asli, ...kontraNilai, jenis: "UP Tunai" } },
    ];
  }
  if (KRITERIA_DONASI.includes(draft.kriteria)) {
    return [
      { table: TABEL_BANK, row: asli },
      { table: TABEL_DONASI, row: { ...asli, jenis: "Donasi" } },
    ];
  }
  if (KRITERIA_RAMADHAN_LANGSUNG.includes(draft.kriteria)) {
    return [
      { table: TABEL_BANK, row: asli },
      { table: TABEL_RAMADHAN, row: { ...asli, jenis: "Ramadhan" } },
    ];
  }
  if (KRITERIA_RAMADHAN_UM.includes(draft.kriteria)) {
    return [
      { table: TABEL_BANK, row: asli },
      { table: TABEL_RAMADHAN, row: { ...asli, ...kontraNilai, jenis: "Ramadhan" } },
    ];
  }
  if (KRITERIA_QURBAN_LANGSUNG.includes(draft.kriteria)) {
    return [
      { table: TABEL_BANK, row: asli },
      { table: TABEL_QURBAN, row: { ...asli, jenis: "Qurban" } },
    ];
  }
  if (KRITERIA_QURBAN_UM.includes(draft.kriteria)) {
    return [
      { table: TABEL_BANK, row: asli },
      { table: TABEL_QURBAN, row: { ...asli, ...kontraNilai, jenis: "Qurban" } },
    ];
  }

  // Rule a (default): kriteria operasional umum -- tabel_bank & tabel_up_bank
  // sama persis (salinan, BUKAN kontra).
  return [
    { table: TABEL_BANK, row: asli },
    { table: TABEL_UP_BANK, row: asli },
  ];
}
