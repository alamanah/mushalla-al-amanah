import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { fetchHijriDateID, fetchPrayerTimes, PrayerTimesResult } from "../lib/prayerTimes";
import { ZONA_WAKTU } from "../lib/waktu";
import { TABEL_INFAQ_BUKA_PUASA, TABEL_UP_BANK, TABEL_UP_TUNAI } from "../lib/tabelKeuangan";
import { FinancialTransaction, LaporanPublikasi, PrayerOverride } from "../types";
import LaporanKeuanganTab from "./dashboard/LaporanKeuanganTab";
import KajianList from "../components/KajianList";
import KhatibJumatList from "../components/KhatibJumatList";
import InfaqCard from "../components/InfaqCard";

/** Cuma 6 field jam shalat (bukan "date"/"hijri" yang juga ada di
 * PrayerTimesResult) -- supaya `times[key]` di bawah selalu bertipe `string`
 * (bukan `string | undefined`, karena "hijri" itu field opsional). */
type PrayerKey = "subuh" | "terbit" | "dzuhur" | "ashar" | "maghrib" | "isya";

const PRAYER_ROWS: { key: PrayerKey; label: string }[] = [
  { key: "subuh", label: "Subuh" },
  { key: "terbit", label: "Terbit" },
  { key: "dzuhur", label: "Dzuhur" },
  { key: "ashar", label: "Ashar" },
  { key: "maghrib", label: "Maghrib" },
  { key: "isya", label: "Isya" },
];

/** Urutan konten yang bergantian tampil di panel kanan. */
const SLIDES = ["laporan", "kajian", "khatib", "infaq"] as const;
type SlideKey = (typeof SLIDES)[number];
/** Lama tiap slide tampil sebelum geser ke slide berikutnya. */
const DURASI_SLIDE_DETIK = 20;

/**
 * Halaman khusus untuk ditampilkan di layar TV mushalla (rute ini SENGAJA
 * diletakkan di luar <PublicLayout> di App.tsx -- tanpa Navbar/Footer, full
 * satu layar penuh). Tidak perlu login: semua data yang dibaca di sini
 * (jadwal shalat, kajian, khatib Jumat, laporan keuangan, rekening infaq)
 * memang sudah bisa dibaca publik lewat RLS "public_read", sama seperti
 * Beranda & halaman /keuangan.
 *
 * Tata letak: kolom KIRI jadi "frame" tetap berisi Jadwal Shalat (selalu
 * tampil, tidak ikut berganti) -- kolom KANAN bergantian menampilkan Laporan
 * Keuangan, Jadwal Kajian, Jadwal Khatib Jumat, dan info Rekening Infaq,
 * geser dari kanan ke kiri tiap `DURASI_SLIDE_DETIK` detik (lihat animasi
 * `.layar-tv-slide` di index.css).
 *
 * Halaman ini dirancang untuk dibiarkan menyala terus-menerus berhari-hari
 * di TV (lihat data disegarkan berkala lewat setInterval, BUKAN cuma sekali
 * saat halaman dibuka) -- lihat juga SETUP.md bagian pemasangan layar TV.
 */
export default function LayarTv() {
  // -- jam & tanggal berjalan (WITA) --
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // -- jadwal shalat & tanggal Hijriah hari ini --
  const [times, setTimes] = useState<PrayerTimesResult | null>(null);
  const [override, setOverride] = useState<PrayerOverride | null>(null);
  const [hijri, setHijri] = useState<string | null>(null);
  useEffect(() => {
    const load = () => {
      const today = new Date();
      const ymd = today.toISOString().slice(0, 10);
      Promise.allSettled([
        fetchPrayerTimes(today),
        supabase.from("prayer_schedule_override").select("*").eq("date", ymd).maybeSingle(),
        fetchHijriDateID(today),
      ]).then(([timesResult, overrideResult, hijriResult]) => {
        if (timesResult.status === "fulfilled") setTimes(timesResult.value);
        setOverride(
          overrideResult.status === "fulfilled" && overrideResult.value.data
            ? (overrideResult.value.data as PrayerOverride)
            : null
        );
        setHijri(hijriResult.status === "fulfilled" ? hijriResult.value : null);
      });
    };
    load();
    // Disegarkan tiap jam -- cukup utk pindah tanggal lewat tengah malam &
    // ambil koreksi jadwal (override) terbaru kalau ada, tanpa perlu reload
    // penuh halaman (halaman ini dibiarkan menyala terus berhari-hari).
    const id = setInterval(load, 60 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const getValue = (key: PrayerKey): string => {
    const overrideVal = override ? (override as unknown as Record<string, string | null>)[key] : null;
    if (overrideVal) return overrideVal;
    return times ? times[key] : "-";
  };

  const jamSekarangHm = now.toLocaleTimeString("id-ID", {
    timeZone: ZONA_WAKTU,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  // Waktu shalat yang disorot -- baris PERTAMA yang jamnya belum lewat.
  // Kalau semua sudah lewat (sudah masuk Isya malam), baliknya Subuh (dianggap
  // giliran berikutnya besok pagi) -- kasus ini jarang kelihatan karena TV
  // biasanya sudah dimatikan malam hari.
  const waktuDisorot = useMemo(() => {
    const resolve = (key: PrayerKey): string => {
      const overrideVal = override ? (override as unknown as Record<string, string | null>)[key] : null;
      if (overrideVal) return overrideVal;
      return times ? times[key] : "-";
    };
    for (const r of PRAYER_ROWS) {
      const v = resolve(r.key);
      if (v && v !== "-" && v >= jamSekarangHm) return r.key;
    }
    return PRAYER_ROWS[0].key;
  }, [times, override, jamSekarangHm]);

  // -- data Laporan Keuangan (logika sama seperti src/pages/FinancialReport.tsx) --
  const [laporanItems, setLaporanItems] = useState<FinancialTransaction[]>([]);
  const [bukaPuasaItems, setBukaPuasaItems] = useState<FinancialTransaction[]>([]);
  const [publishedPeriodes, setPublishedPeriodes] = useState<Set<string>>(new Set());
  const [laporanLoading, setLaporanLoading] = useState(true);
  useEffect(() => {
    const muatLaporan = () => {
      Promise.all([
        supabase.from(TABEL_UP_BANK).select("*"),
        supabase.from(TABEL_UP_TUNAI).select("*"),
        supabase.from(TABEL_INFAQ_BUKA_PUASA).select("*"),
        supabase.from("laporan_publikasi").select("periode"),
      ]).then(([upBank, upTunai, buka, publikasi]) => {
        const upBankRows = (upBank.data as FinancialTransaction[]) ?? [];
        const upTunaiRows = (upTunai.data as FinancialTransaction[]) ?? [];
        setLaporanItems([...upBankRows, ...upTunaiRows]);
        setBukaPuasaItems((buka.data as FinancialTransaction[]) ?? []);
        setPublishedPeriodes(
          new Set(((publikasi.data as Pick<LaporanPublikasi, "periode">[]) ?? []).map((p) => p.periode))
        );
        setLaporanLoading(false);
      });
    };
    muatLaporan();
    // Disegarkan tiap 5 menit -- cukup responsif kalau bendahara habis input
    // transaksi atau baru menekan "Publikasikan" di dashboard.
    const id = setInterval(muatLaporan, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  // -- slide kanan bergantian --
  const [slideIdx, setSlideIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setSlideIdx((i) => (i + 1) % SLIDES.length), DURASI_SLIDE_DETIK * 1000);
    return () => clearInterval(id);
  }, []);
  const slideAktif: SlideKey = SLIDES[slideIdx];

  const tanggalSekarang = now.toLocaleDateString("id-ID", {
    timeZone: ZONA_WAKTU,
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const jamTampil = now.toLocaleTimeString("id-ID", {
    timeZone: ZONA_WAKTU,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <div className="h-screen w-screen overflow-hidden flex bg-primary-950 text-white">
      {/* Kolom kiri -- frame TETAP, tidak ikut geser/berganti */}
      <div className="w-[36%] shrink-0 h-full flex flex-col p-8 bg-gradient-to-b from-primary-900 to-primary-950">
        <div className="flex items-center gap-3 mb-8">
          <img
            src={`${import.meta.env.BASE_URL}logo-al-amanah.png`}
            alt="Logo Mushalla Al Amanah"
            className="h-16 w-auto shrink-0"
          />
          <div>
            <p className="font-serif font-bold text-xl leading-tight">Mushalla Al Amanah</p>
            <p className="text-sm text-white/60 leading-tight">Gedung Keuangan Negara I Denpasar</p>
          </div>
        </div>

        <div className="mb-8">
          <p className="text-5xl font-bold tracking-wide tabular-nums">{jamTampil}</p>
          <p className="text-white/70 mt-1">{tanggalSekarang}</p>
          {hijri && <p className="text-gold-400 text-sm mt-0.5">{hijri}</p>}
        </div>

        <p className="text-xs uppercase tracking-widest text-white/50 mb-3">Jadwal Shalat &middot; Denpasar</p>
        <div className="flex-1 flex flex-col justify-center gap-2.5">
          {PRAYER_ROWS.map((r) => {
            const aktif = waktuDisorot === r.key;
            return (
              <div
                key={r.key}
                className={`flex items-center justify-between rounded-xl px-5 py-3.5 transition-colors ${
                  aktif ? "bg-gold-500 text-primary-950" : "bg-white/5"
                }`}
              >
                <span className={`font-medium ${aktif ? "" : "text-white/80"}`}>{r.label}</span>
                <span className="text-2xl font-bold tabular-nums">{getValue(r.key)}</span>
              </div>
            );
          })}
        </div>
        {override?.note && <p className="text-xs text-gold-400/90 mt-4">Catatan: {override.note}</p>}
        <p className="text-[11px] text-white/30 mt-4">Dihitung otomatis (metode Kemenag RI).</p>
      </div>

      {/* Kolom kanan -- konten bergantian, geser dari kanan ke kiri */}
      <div className="flex-1 h-full relative overflow-hidden bg-white text-gray-900">
        <div key={slideIdx} className="layar-tv-slide absolute inset-0 overflow-y-auto px-10 py-8">
          {slideAktif === "laporan" &&
            (laporanLoading ? (
              <p className="text-gray-400">Memuat laporan keuangan...</p>
            ) : (
              <LaporanKeuanganTab
                items={laporanItems}
                bukaPuasaItems={bukaPuasaItems}
                showControls={false}
                publishedPeriodes={publishedPeriodes}
              />
            ))}
          {slideAktif === "kajian" && <KajianList />}
          {slideAktif === "khatib" && <KhatibJumatList />}
          {slideAktif === "infaq" && <InfaqCard />}
        </div>

        {/* Indikator slide aktif -- cuma penanda visual, tidak diklik (layar
            TV tidak ada yang mengoperasikan). */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
          {SLIDES.map((s) => (
            <span
              key={s}
              className={`h-2 rounded-full transition-all ${
                s === slideAktif ? "w-6 bg-primary-700" : "w-2 bg-gray-300"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
