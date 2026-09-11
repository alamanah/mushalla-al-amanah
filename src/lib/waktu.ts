/**
 * Semua jam transaksi keuangan Mushalla Al Amanah GKN I Denpasar dianggap
 * WITA (Asia/Makassar, UTC+8) -- terlepas dari zona waktu perangkat/browser
 * yang dipakai bendahara untuk input atau melihat data. Sebelumnya kode
 * memakai `new Date().toISOString()` (UTC) untuk mengisi form dan memakai
 * getter lokal browser untuk membaca ulang, lalu mengirim string tanggal
 * TANPA offset ke kolom `timestamptz` di Supabase -- akibatnya Postgres
 * (yang zona sesinya UTC) salah mengartikan jam WITA sebagai jam UTC,
 * sehingga saat ditampilkan kembali jamnya bergeser +8 jam (mis. CSV/DB
 * tertulis 14.17 tapi di web muncul 22.17).
 *
 * Helper di file ini selalu menyertakan offset "+08:00" secara eksplisit
 * saat MENYIMPAN, dan selalu memformat dengan timeZone "Asia/Makassar" saat
 * MENAMPILKAN, supaya hasilnya konsisten apa pun zona waktu perangkat yang
 * dipakai.
 */

export const ZONA_WAKTU = "Asia/Makassar"; // WITA, UTC+8
const OFFSET_WITA = "+08:00";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Bangun ISO string ber-offset WITA eksplisit dari komponen tanggal/jam
 * (komponen dianggap sudah dalam jam WITA). Ini format yang dikirim ke
 * database. */
export function witaIso(y: number, mo: number, d: number, h: number, mi: number, s = 0): string {
  return `${y}-${pad(mo)}-${pad(d)}T${pad(h)}:${pad(mi)}:${pad(s)}${OFFSET_WITA}`;
}

/** Bangun string "YYYY-MM-DDTHH:mm:ss" polos (TANPA offset) dari komponen
 * tanggal/jam WITA -- format yang kompatibel dengan value <input
 * type="datetime-local">, dipakai untuk draft pratinjau upload sebelum
 * disimpan ke database. */
export function naiveWitaDatetime(y: number, mo: number, d: number, h: number, mi: number, s = 0): string {
  return `${y}-${pad(mo)}-${pad(d)}T${pad(h)}:${pad(mi)}:${pad(s)}`;
}

/** Ubah value dari <input type="datetime-local"> (diisi/dibaca user sebagai
 * jam WITA) jadi ISO string ber-offset WITA eksplisit untuk dikirim ke
 * database. Balikin null kalau kosong (mis. Saldo Awal tanpa tanggal). */
export function datetimeLocalToWitaIso(value: string): string | null {
  if (!value) return null;
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return null;
  const [, y, mo, d, h, mi, s] = m;
  return witaIso(Number(y), Number(mo), Number(d), Number(h), Number(mi), Number(s ?? "0"));
}

/** Ubah instant (ISO string dari database) jadi value untuk <input
 * type="datetime-local"> yang menampilkan jam WITA -- bukan jam lokal
 * perangkat yang sedang dipakai untuk membuka halaman. */
export function toWitaDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA_WAKTU,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

/** Value default <input type="datetime-local"> = waktu sekarang di WITA. */
export function nowWitaDatetimeLocal(): string {
  return toWitaDatetimeLocal(new Date().toISOString());
}

/** Format instant (ISO string dari database) untuk ditampilkan, selalu
 * dalam jam WITA apa pun zona waktu perangkat yang sedang melihat. */
export function formatWita(t: string | null, opts: Intl.DateTimeFormatOptions = {}): string {
  if (!t) return "-";
  const d = new Date(t);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleString("id-ID", { timeZone: ZONA_WAKTU, ...opts });
}
