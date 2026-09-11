import * as XLSX from "xlsx";
import { DraftTransaction, FinancialKriteria } from "../types";
import { datetimeLocalToWitaIso, naiveWitaDatetime, toWitaDatetimeLocal } from "./waktu";

function readFileRows(file: File): Promise<unknown[][]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Gagal membaca file"));
    reader.onload = () => {
      try {
        const data = new Uint8Array(reader.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array", raw: true });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
          header: 1,
          raw: true,
          blankrows: true,
          defval: "",
        });
        resolve(rows);
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsArrayBuffer(file);
  });
}

function cell(row: unknown[], idx: number): string {
  const v = row[idx];
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

/** Parse angka format Indonesia: hapus koma ribuan, buang tanda "-" di akhir (BSI). */
function parseAmount(raw: string): number {
  if (!raw) return 0;
  let s = raw.replace(/,/g, "").trim();
  if (s === "" || s === ".") return 0;
  const negativeTrailing = s.endsWith("-");
  if (negativeTrailing) s = s.slice(0, -1);
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

/** Ambil komponen tanggal/jam mentah dari teks "YYYY-MM-DD HH:mm[:ss]" (atau
 * dengan "T") TANPA lewat `new Date()`, supaya tidak tergantung zona waktu
 * perangkat yang membuka halaman upload -- jam di rekening koran BRI selalu
 * dianggap jam WITA apa adanya. */
function parseIsoLikeComponents(
  raw: string
): { y: number; mo: number; d: number; h: number; mi: number; s: number } | null {
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return null;
  const [, y, mo, d, h, mi, s] = m;
  return { y: Number(y), mo: Number(mo), d: Number(d), h: Number(h), mi: Number(mi), s: Number(s ?? "0") };
}

/** Ambil "YYYY-MM-DDTHH:mm" (jam WITA) dari string tanggal apapun formatnya --
 * naive (draft upload, dianggap WITA) maupun ber-offset (sudah tersimpan di
 * database) -- supaya perbandingan duplikat tidak terpengaruh perbedaan
 * format penyimpanan antara draft upload dan data di database. */
function minuteKey(tanggal: string | null | undefined, isNaiveWita: boolean): string {
  if (!tanggal) return "";
  const iso = isNaiveWita ? datetimeLocalToWitaIso(tanggal.slice(0, 16)) : tanggal;
  if (!iso) return "";
  const local = toWitaDatetimeLocal(iso);
  return local || tanggal;
}

/**
 * Buang baris draft yang tanggal (sampai menit) + debet + kredit-nya PERSIS
 * sama dengan transaksi yang sudah ada di database -- kasus umum saat
 * mengunggah rekening koran yang rentang tanggalnya tumpang tindih dengan
 * unggahan sebelumnya.
 */
export function splitDuplicates(
  drafts: DraftTransaction[],
  existing: { tanggal: string | null; debet: number; kredit: number }[]
): { unique: DraftTransaction[]; duplicateCount: number } {
  const existingKeys = new Set(
    existing.map((e) => `${minuteKey(e.tanggal, false)}|${Number(e.debet)}|${Number(e.kredit)}`)
  );
  const unique = drafts.filter(
    (d) => !existingKeys.has(`${minuteKey(d.tanggal, true)}|${Number(d.debet)}|${Number(d.kredit)}`)
  );
  return { unique, duplicateCount: drafts.length - unique.length };
}

/** Tebak Kriteria dari teks uraian, supaya bendahara tinggal koreksi bukan isi dari nol. */
function guessKriteria(uraian: string): FinancialKriteria {
  const u = uraian.toUpperCase();
  if (u.includes("QRIS")) return "QRIS";
  if (u.includes("SETOR") && u.includes("TUNAI")) return "Setor Tunai Jumat";
  if (u.includes("ADM") || u.includes("BIAYA")) return "Admin";
  if (u.includes("GAJI")) return "Gaji";
  if (u.includes("QURBAN") || u.includes("PENGQURBAN")) return "Qurban";
  if (u.includes("BUKA PUASA")) return "Infaq Buka Puasa";
  if (u.includes("RAMADHAN")) return "Ramadhan";
  if (u.includes("DONASI")) return "Donasi";
  if (u.includes("TRF") || u.includes("TRANSFER") || u.includes("BIFAST")) return "Transfer";
  return "Lainnya";
}

/**
 * Rekening koran BRI (export .csv dari internet banking/mutasi rekening).
 * Kolom C = TGL_TRAN, Kolom P = TRREMK (uraian), Kolom J = MUTASI_KREDIT
 * (dipetakan ke Debet aplikasi = uang masuk), Kolom I = MUTASI_DEBET
 * (dipetakan ke Kredit aplikasi = uang keluar). Data mulai baris ke-2.
 */
export async function parseBriStatement(file: File): Promise<DraftTransaction[]> {
  const rows = await readFileRows(file);
  const out: DraftTransaction[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;
    const tglRaw = cell(row, 2); // Kolom C
    if (!tglRaw) continue;
    const uraian = cell(row, 15); // Kolom P
    const debet = parseAmount(cell(row, 9)); // Kolom J -> Debet
    const kredit = parseAmount(cell(row, 8)); // Kolom I -> Kredit

    const comp = parseIsoLikeComponents(tglRaw);
    if (!comp) continue;

    out.push({
      tanggal: naiveWitaDatetime(comp.y, comp.mo, comp.d, comp.h, comp.mi, comp.s),
      uraian,
      kriteria: guessKriteria(uraian),
      debet,
      kredit,
      keterangan: uraian,
      jenis: "BRI",
    });
  }
  return out;
}

/**
 * Rekening koran BSI (export .csv). Baris metadata di atas, header di baris
 * ke-8, data mulai baris ke-9. Kolom A = Waktu Transaksi (dd-mm-yyyy hh.mm),
 * Kolom G = Deskripsi (uraian), Kolom I = Kredit file (dipetakan ke Debet
 * aplikasi = uang masuk), Kolom H = Debet file (dipetakan ke Kredit
 * aplikasi = uang keluar, format "1,000,000.00-").
 */
export async function parseBsiStatement(file: File): Promise<DraftTransaction[]> {
  const rows = await readFileRows(file);
  const out: DraftTransaction[] = [];

  for (let i = 8; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;
    const waktuRaw = cell(row, 0); // Kolom A: "04-09-2026 08.48"
    if (!waktuRaw) continue;
    const uraian = cell(row, 6); // Kolom G
    const debet = parseAmount(cell(row, 8)); // Kolom I -> Debet
    const kredit = parseAmount(cell(row, 7)); // Kolom H -> Kredit

    const m = waktuRaw.match(/^(\d{2})-(\d{2})-(\d{4})\s+(\d{2})\.(\d{2})/);
    if (!m) continue;
    const [, dd, mm, yyyy, hh, min] = m;

    out.push({
      tanggal: naiveWitaDatetime(Number(yyyy), Number(mm), Number(dd), Number(hh), Number(min)),
      uraian,
      kriteria: guessKriteria(uraian),
      debet,
      kredit,
      keterangan: uraian,
      jenis: "BSI",
    });
  }
  return out;
}
