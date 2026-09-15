import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { fetchPrayerTimes, PrayerTimesResult } from "../lib/prayerTimes";
import { PrayerOverride } from "../types";

const ROWS: { key: keyof PrayerTimesResult; label: string }[] = [
  { key: "subuh", label: "Subuh" },
  { key: "terbit", label: "Terbit" },
  { key: "dzuhur", label: "Dzuhur" },
  { key: "ashar", label: "Ashar" },
  { key: "maghrib", label: "Maghrib" },
  { key: "isya", label: "Isya" },
];

export default function PrayerTimesCard() {
  const [times, setTimes] = useState<PrayerTimesResult | null>(null);
  const [override, setOverride] = useState<PrayerOverride | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = new Date();
    const ymd = today.toISOString().slice(0, 10);

    Promise.allSettled([
      fetchPrayerTimes(today),
      supabase.from("prayer_schedule_override").select("*").eq("date", ymd).maybeSingle(),
    ]).then(([apiResult, overrideResult]) => {
      if (apiResult.status === "fulfilled") {
        setTimes(apiResult.value);
      } else {
        setError("Tidak dapat memuat jadwal shalat otomatis saat ini.");
      }
      if (overrideResult.status === "fulfilled" && overrideResult.value.data) {
        setOverride(overrideResult.value.data as PrayerOverride);
      }
      setLoading(false);
    });
  }, []);

  const getValue = (key: keyof PrayerTimesResult) => {
    const overrideVal = override ? (override as unknown as Record<string, string | null>)[key] : null;
    if (overrideVal) return overrideVal;
    return times ? times[key] : "-";
  };

  return (
    <div className="panel">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-serif font-bold text-lg text-primary-900">Jadwal Shalat Hari Ini</h3>
        <span className="text-xs text-gray-400">Denpasar, WITA</span>
      </div>

      {loading && <p className="text-sm text-gray-400">Memuat jadwal...</p>}
      {error && !loading && <p className="text-sm text-red-500">{error}</p>}

      {!loading && (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 text-center">
          {ROWS.map((r) => (
            <div key={r.key} className="bg-primary-50 rounded-lg py-3">
              <p className="text-xs text-primary-700 font-medium">{r.label}</p>
              <p className="text-lg font-bold text-primary-900">{getValue(r.key)}</p>
            </div>
          ))}
        </div>
      )}

      {times?.hijri && <p className="text-xs text-gray-400 mt-3">{times.hijri}</p>}
      {override?.note && <p className="text-xs text-gold-600 mt-2">Catatan: {override.note}</p>}
      <p className="text-[11px] text-gray-400 mt-3">
        Dihitung otomatis (metode Kemenag RI). Waktu dapat berbeda ±1-2 menit di lapangan.
      </p>
    </div>
  );
}
