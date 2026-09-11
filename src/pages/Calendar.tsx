import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { fetchHijriMap } from "../lib/prayerTimes";
import { todayStr } from "../lib/useKajianLive";
import { KajianSchedule, KhatibJumatSchedule } from "../types";

type AgendaItem =
  | { tipe: "kajian"; data: KajianSchedule }
  | { tipe: "khatib"; data: KhatibJumatSchedule };

const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const BULAN = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];
const MAX_CHIP_PER_HARI = 2;

function toIso(y: number, m: number, d: number) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

function formatTanggalPanjang(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("id-ID", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
}

/** Judul singkat item, dipakai untuk chip di grid kalender. */
function judulSingkat(item: AgendaItem): string {
  return item.tipe === "kajian" ? item.data.title : item.data.nama_ustadz;
}

/** Teks gabungan tiap item, dipakai untuk filter pencarian di panel detail. */
function teksPencarian(item: AgendaItem): string {
  if (item.tipe === "kajian") {
    return [item.data.title, item.data.ustadz, item.data.location, item.data.description].filter(Boolean).join(" ");
  }
  return [item.data.nama_ustadz, "khatib jumat"].filter(Boolean).join(" ");
}

/**
 * Halaman Kalender publik: grid kalender bulanan gabungan Jadwal Kajian +
 * Jadwal Khatib Jumat -- klik salah satu tanggal untuk lihat detail
 * kegiatannya di panel kanan. Kajian rutin mingguan (tanpa tanggal spesifik,
 * berdasar hari) otomatis muncul berulang di tiap kemunculan hari itu
 * sepanjang bulan yang ditampilkan.
 */
export default function Calendar() {
  const today = todayStr();
  const [y0, m0] = today.split("-").map(Number);

  const [kajian, setKajian] = useState<KajianSchedule[]>([]);
  const [khatib, setKhatib] = useState<KhatibJumatSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [hijriMap, setHijriMap] = useState<Record<string, string | null>>({});

  const [viewYear, setViewYear] = useState(y0);
  const [viewMonth, setViewMonth] = useState(m0 - 1); // 0-11
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [search, setSearch] = useState("");

  useEffect(() => {
    Promise.all([
      supabase.from("kajian_schedule").select("*").eq("is_active", true),
      supabase.from("khatib_jumat_schedule").select("*").eq("is_active", true),
    ]).then(([kajianRes, khatibRes]) => {
      const kajianRows = (kajianRes.data as KajianSchedule[]) ?? [];
      const khatibRows = (khatibRes.data as KhatibJumatSchedule[]) ?? [];
      setKajian(kajianRows);
      setKhatib(khatibRows);
      setLoading(false);
      fetchHijriMap(khatibRows.map((k) => k.tanggal)).then(setHijriMap);
    });
  }, []);

  /** Peta tanggal (YYYY-MM-DD) -> daftar item (tanggal spesifik + kajian rutin
   * mingguan yang jatuh pada hari itu), dibangun ulang tiap kali bulan yang
   * ditampilkan berubah -- supaya kajian mingguan otomatis "berulang" tiap
   * minggu di grid. */
  const itemsByDate = useMemo(() => {
    const map = new Map<string, AgendaItem[]>();
    const add = (iso: string, item: AgendaItem) => {
      if (!map.has(iso)) map.set(iso, []);
      map.get(iso)!.push(item);
    };

    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = toIso(viewYear, viewMonth, d);
      const dow = new Date(viewYear, viewMonth, d).getDay();
      kajian.forEach((k) => {
        if (k.specific_date === iso) add(iso, { tipe: "kajian", data: k });
        else if (!k.specific_date && k.day_of_week === dow) add(iso, { tipe: "kajian", data: k });
      });
      khatib.forEach((k) => {
        if (k.tanggal === iso) add(iso, { tipe: "khatib", data: k });
      });
    }
    return map;
  }, [kajian, khatib, viewYear, viewMonth]);

  // Sel grid: 6 baris x 7 kolom, mulai dari hari Minggu pada/sebelum tanggal 1.
  const gridCells = useMemo(() => {
    const firstOfMonth = new Date(viewYear, viewMonth, 1);
    const startOffset = firstOfMonth.getDay(); // 0=Minggu
    const start = new Date(viewYear, viewMonth, 1 - startOffset);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const iso = toIso(d.getFullYear(), d.getMonth(), d.getDate());
      return { date: d, iso, inMonth: d.getMonth() === viewMonth };
    });
  }, [viewYear, viewMonth]);

  const gotoMonth = (delta: number) => {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 0) {
      m = 11;
      y -= 1;
    } else if (m > 11) {
      m = 0;
      y += 1;
    }
    setViewMonth(m);
    setViewYear(y);
  };

  const detailItems = (itemsByDate.get(selectedDate) ?? []).filter((item) =>
    teksPencarian(item).toLowerCase().includes(search.trim().toLowerCase())
  );

  const tahunOptions = Array.from({ length: 6 }, (_, i) => y0 - 1 + i);

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="font-serif text-2xl font-bold text-primary-900 mb-1">Kalender Kegiatan</h1>
      <p className="text-sm text-gray-500 mb-6">Jadwal Kajian dan Khatib Jumat Mushalla Al Amanah.</p>

      {loading ? (
        <p className="text-sm text-gray-400">Memuat kalender...</p>
      ) : (
        <div className="grid lg:grid-cols-[1fr_340px] gap-6 items-start">
          {/* Grid kalender bulanan */}
          <div className="card !p-4 overflow-x-auto">
            <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
              <button
                type="button"
                className="h-9 w-9 shrink-0 rounded-full bg-primary-700 text-white flex items-center justify-center hover:bg-primary-800"
                onClick={() => gotoMonth(-1)}
                aria-label="Bulan sebelumnya"
              >
                ‹
              </button>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500">Bulan:</span>
                <select
                  className="input !w-auto !py-1.5"
                  value={viewMonth}
                  onChange={(e) => setViewMonth(Number(e.target.value))}
                >
                  {BULAN.map((b, i) => (
                    <option key={b} value={i}>
                      {b}
                    </option>
                  ))}
                </select>
                <span className="text-gray-500">Tahun:</span>
                <select
                  className="input !w-auto !py-1.5"
                  value={viewYear}
                  onChange={(e) => setViewYear(Number(e.target.value))}
                >
                  {tahunOptions.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                className="h-9 w-9 shrink-0 rounded-full bg-primary-700 text-white flex items-center justify-center hover:bg-primary-800"
                onClick={() => gotoMonth(1)}
                aria-label="Bulan berikutnya"
              >
                ›
              </button>
            </div>

            <div className="min-w-[560px]">
              <div className="grid grid-cols-7 text-center text-xs font-semibold text-gray-500 mb-1">
                {HARI.map((h) => (
                  <div key={h} className="py-1">
                    {h}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {gridCells.map(({ date, iso, inMonth }) => {
                  const dayItems = itemsByDate.get(iso) ?? [];
                  const isToday = iso === today;
                  const isSelected = iso === selectedDate;
                  return (
                    <button
                      type="button"
                      key={iso}
                      disabled={!inMonth}
                      onClick={() => setSelectedDate(iso)}
                      className={`text-left align-top rounded-lg border p-1.5 min-h-[86px] transition-colors ${
                        !inMonth
                          ? "border-transparent text-gray-300 cursor-default"
                          : isToday
                          ? "border-primary-700 bg-primary-700 text-white"
                          : isSelected
                          ? "border-primary-300 bg-primary-50"
                          : "border-gray-100 hover:bg-gray-50"
                      }`}
                    >
                      <span className={`text-xs font-medium ${isToday ? "text-white" : "text-gray-700"}`}>
                        {date.getDate()}
                      </span>
                      {inMonth && dayItems.length > 0 && (
                        <div className="mt-1 flex flex-col gap-0.5">
                          {dayItems.slice(0, MAX_CHIP_PER_HARI).map((item, i) => (
                            <span
                              key={i}
                              className={`block truncate rounded px-1 py-0.5 text-[10px] leading-tight ${
                                item.tipe === "kajian"
                                  ? isToday
                                    ? "bg-white/20 text-white"
                                    : "bg-primary-100 text-primary-700"
                                  : isToday
                                  ? "bg-white/20 text-white"
                                  : "bg-gold-500/20 text-gold-700"
                              }`}
                            >
                              {judulSingkat(item)}
                            </span>
                          ))}
                          {dayItems.length > MAX_CHIP_PER_HARI && (
                            <span className="block rounded px-1 py-0.5 text-[10px] leading-tight bg-red-500 text-white text-center">
                              +{dayItems.length - MAX_CHIP_PER_HARI}
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-3">Klik salah satu tanggal untuk melihat detail kegiatan di panel kanan.</p>
          </div>

          {/* Panel detail */}
          <div className="card !p-4 lg:sticky lg:top-20">
            <h2 className="font-serif font-bold text-primary-900 mb-1">Detail Kegiatan</h2>
            <p className="text-sm text-gray-500 mb-3">{formatTanggalPanjang(selectedDate)}</p>
            <input
              className="input mb-3"
              placeholder="Cari ustadz, judul, lokasi..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {detailItems.length === 0 && (
              <p className="text-sm text-gray-400">Tidak ada kegiatan pada tanggal ini.</p>
            )}
            <div className="flex flex-col gap-3 max-h-[520px] overflow-y-auto">
              {detailItems.map((item, i) => (
                <div key={i} className="rounded-lg border border-gray-100 p-3">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span
                      className={`badge ${
                        item.tipe === "kajian" ? "bg-primary-100 text-primary-700" : "bg-gold-500/20 text-gold-700"
                      }`}
                    >
                      {item.tipe === "kajian" ? "Kajian" : "Khatib Jumat"}
                    </span>
                    {item.data.live_video_id && <span className="badge bg-red-100 text-red-700">🔴 LIVE</span>}
                  </div>
                  {item.tipe === "kajian" ? (
                    <>
                      <p className="font-medium text-gray-800">{item.data.title}</p>
                      <p className="text-sm text-gray-500">
                        {item.data.time_text} {item.data.ustadz ? `· ${item.data.ustadz}` : ""}
                      </p>
                      {item.data.location && <p className="text-xs text-gray-400 mt-0.5">{item.data.location}</p>}
                      {item.data.description && <p className="text-xs text-gray-400 mt-1">{item.data.description}</p>}
                    </>
                  ) : (
                    <>
                      <p className="font-medium text-gray-800">{item.data.nama_ustadz}</p>
                      {hijriMap[item.data.tanggal] && (
                        <p className="text-xs text-gray-400 mt-0.5">{hijriMap[item.data.tanggal]}</p>
                      )}
                      {item.data.link_youtube && (
                        <a
                          href={item.data.link_youtube}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-primary-700 hover:underline"
                        >
                          Link YouTube
                        </a>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
