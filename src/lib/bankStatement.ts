import * as XLSX from "xlsx";
import { DraftTransaction, FinancialKriteria } from "../types";

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

function toLocalDatetimeString(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}:${pad(d.getSeconds())}`;
}

/** Ambil "YYYY-MM-DDTHH:mm" dari string tanggal apapun formatnya (dengan/tanpa
 * detik atau zona waktu), supaya perbandingan duplikat tidak terpengaruh
 * perbedaan format penyimpanan antara draft upload dan data di database. */
function minuteKey(tanggal: string | null | undefined): string {
  if (!tanggal) return "";
  const m = tanggal.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}):(\d{2})/);
  return m ? `${m[1]}T${m[2]}:${m[3]}` : tanggal;
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
    existing.map((e) => `${minuteKey(e.tanggal)}|${Number(e.debet)}|${Number(e.kredit)}`)
  );
  const unique = drafts.filter(
    (d) => !existingKeys.has(`${minuteKey(d.tanggal)}|${Number(d.debet)}|${Number(d.kredit)}`)
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

    const d = new Date(tglRaw.replace(" ", "T"));
    if (isNaN(d.getTime())) continue;

    out.push({
      tanggal: toLocalDatetimeString(d),
      uraian,
      kriteria: guessKriteria(uraian),
      debet,
      kredit,
      keterangan: uraian,
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
    const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh), Number(min));

    out.push({
      tanggal: toLocalDatetimeString(d),
      uraian,
      kriteria: guessKriteria(uraian),
      debet,
      kredit,
      keterangan: uraian,
    });
  }
  return out;
}
