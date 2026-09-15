// Jadwal shalat otomatis untuk Mushalla Al Amanah GKN I Denpasar
// menggunakan Aladhan API (https://aladhan.com/prayer-times-api) dengan
// metode perhitungan Kementerian Agama RI (method=20), dikoreksi ke zona
// waktu Asia/Makassar (WITA).

export interface PrayerTimesResult {
  date: string; // format YYYY-MM-DD
  subuh: string;
  terbit: string;
  dzuhur: string;
  ashar: string;
  maghrib: string;
  isya: string;
  hijri?: string;
}

// Koordinat Kota Denpasar, Bali
const DENPASAR_LAT = -8.6705;
const DENPASAR_LON = 115.2126;
const METHOD = 20; // Kementerian Agama Republik Indonesia

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function toYMD(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

interface HijriRaw {
  day: string;
  monthNumber: number;
  monthEn: string;
  year: string;
}

/** Cache in-memory hasil konversi Masehi->Hijriah per tanggal (key: "YYYY-MM-DD"),
 * supaya tanggal yang sama tidak di-fetch berulang-ulang ke API (dipakai lintas
 * komponen, mis. daftar Jadwal Khatib Jumat, dan generator pamflet otomatis). */
const hijriCache = new Map<string, HijriRaw | null>();

async function fetchHijriRaw(date: Date): Promise<HijriRaw | null> {
  const key = toYMD(date);
  if (hijriCache.has(key)) return hijriCache.get(key)!;
  const dmy = `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()}`;
  try {
    const res = await fetch(`https://api.aladhan.com/v1/gToH/${dmy}`);
    if (!res.ok) throw new Error("Gagal mengambil tanggal Hijriah");
    const json = await res.json();
    const h = json.data?.hijri;
    const result: HijriRaw | null = h
      ? { day: h.day, monthNumber: h.month?.number, monthEn: h.month?.en, year: h.year }
      : null;
    hijriCache.set(key, result);
    return result;
  } catch {
    hijriCache.set(key, null);
    return null;
  }
}

/** Ambil tanggal Hijriah untuk SATU tanggal Masehi tertentu saja (lebih ringan
 * dari fetchPrayerTimes karena tidak perlu hitung jadwal shalat lengkap).
 * Dipakai di tempat yang cuma butuh tanggal Hijriah, mis. Jadwal Khatib Jumat.
 * Nama bulan berbahasa Inggris (apa adanya dari API Aladhan). */
export async function fetchHijriDate(date: Date): Promise<string | null> {
  const h = await fetchHijriRaw(date);
  return h ? `${h.day} ${h.monthEn} ${h.year} H` : null;
}

const HIJRI_MONTH_ID = [
  "Muharram",
  "Safar",
  "Rabiul Awal",
  "Rabiul Akhir",
  "Jumadil Awal",
  "Jumadil Akhir",
  "Rajab",
  "Sya'ban",
  "Ramadhan",
  "Syawal",
  "Dzulkaidah",
  "Dzulhijjah",
];

/** Sama seperti fetchHijriDate, tapi nama bulannya sudah diterjemahkan ke
 * bahasa Indonesia (mis. "4 Sya'ban 1447 H") -- dipakai di generator pamflet
 * otomatis. Perkiraan hasil hisab algoritmik dari API, bisa beda 1 hari dari
 * penetapan resmi (sidang isbat/rukyat). */
export async function fetchHijriDateID(date: Date): Promise<string | null> {
  const h = await fetchHijriRaw(date);
  if (!h) return null;
  const monthId = HIJRI_MONTH_ID[(h.monthNumber || 1) - 1] ?? h.monthEn;
  return `${h.day} ${monthId} ${h.year} H`;
}

/** Ambil tanggal Hijriah untuk BANYAK tanggal Masehi ("YYYY-MM-DD") sekaligus,
 * hasilnya berupa peta tanggal->Hijriah -- dipakai untuk render daftar/list
 * supaya tiap baris tidak perlu fetch satu-satu secara berurutan. Tanggal
 * yang sudah pernah diambil sebelumnya otomatis dari cache (lihat hijriCache). */
export async function fetchHijriMap(dates: (string | null | undefined)[]): Promise<Record<string, string | null>> {
  const unique = Array.from(new Set(dates.filter((d): d is string => !!d)));
  const pairs = await Promise.all(
    unique.map(async (ymd) => {
      const [y, m, d] = ymd.split("-").map(Number);
      return [ymd, await fetchHijriDate(new Date(y, m - 1, d))] as const;
    })
  );
  return Object.fromEntries(pairs);
}

export async function fetchPrayerTimes(date: Date = new Date()): Promise<PrayerTimesResult> {
  const dmy = `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()}`;
  const url = `https://api.aladhan.com/v1/timings/${dmy}?latitude=${DENPASAR_LAT}&longitude=${DENPASAR_LON}&method=${METHOD}&timezonestring=Asia/Makassar`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("Gagal mengambil data jadwal shalat");
  }
  const json = await res.json();
  const t = json.data.timings;
  const hijri = json.data.date?.hijri
    ? `${json.data.date.hijri.day} ${json.data.date.hijri.month.en} ${json.data.date.hijri.year} H`
    : undefined;

  const clean = (v: string) => (v || "").split(" ")[0];

  return {
    date: toYMD(date),
    subuh: clean(t.Fajr),
    terbit: clean(t.Sunrise),
    dzuhur: clean(t.Dhuhr),
    ashar: clean(t.Asr),
    maghrib: clean(t.Maghrib),
    isya: clean(t.Isha),
    hijri,
  };
}
