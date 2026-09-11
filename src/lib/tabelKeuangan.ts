import { DraftTransaction, FinancialJenis, FinancialKriteria } from "../types";

/**
 * Nama 7 tabel keuangan baru (Migrasi 011) -- pengganti `financial_transactions`
 * untuk transaksi yang masuk lewat upload rekening koran (CSV BRI/BSI).
 *
 * TAHAP 1 (sekarang): upload CSV menulis ke tabel-tabel ini.
 * TAHAP 2 (menyusul): tab dashboard (BRI/BSI/UP Tunai/dst) & input manual
 * akan disambungkan untuk MEMBACA/MENULIS ke tabel-tabel ini juga. Sampai
 * Tahap 2 selesai, data hasil upload CSV baru terlihat lewat Supabase Table
 * Editor, BELUM muncul di tab dashboard (yang masih baca `financial_transactions`).
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

  // Baris hasil trigger manual "Jenis: UP Tunai" pada draft (lihat updateDraft
  // di FinancePage.tsx) -- ini BUKAN baris rekening koran asli, langsung
  // masuk tabel_up_tunai saja, tidak perlu jurnal ganda lagi.
  if (draft.jenis === "UP Tunai") {
    return [{ table: TABEL_UP_TUNAI, row: asli }];
  }

  // Kriteria "Infaq Buka Puasa" dipilih manual di draft -- logika jurnal
  // gandanya masih dirancang sendiri oleh bendahara, jadi untuk sementara
  // langsung masuk tabel_infaq_buka_puasa saja (satu baris, tanpa kontra).
  if (draft.jenis === "Infaq Buka Puasa" || draft.kriteria === "Infaq Buka Puasa") {
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
