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
