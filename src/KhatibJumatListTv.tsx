import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { fetchHijriMap } from "../../lib/prayerTimes";
import { KhatibJumatSchedule } from "../../types";

function formatTanggal(tgl: string) {
  const [y, m, d] = tgl.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("id-ID", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
}
function formatTanggalPendek(tgl: string) {
  const [y, m, d] = tgl.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("id-ID", { weekday: "long", day: "2-digit", month: "long" });
}

/**
 * Versi "lebih cakep" Jadwal Khatib Jumat khusus halaman Layar TV -- khatib
 * Jumat TERDEKAT ditonjolkan sebagai kartu besar (avatar inisial ukuran
 * besar + latar gradasi warna utama), diikuti daftar khatib berikutnya
 * (bukan dibatasi per bulan seperti di beranda, supaya jadwal berikutnya
 * selalu kelihatan walau sudah lewat pertengahan bulan).
 */
export default function KhatibJumatListTv() {
  const [items, setItems] = useState<KhatibJumatSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [hijriMap, setHijriMap] = useState<Record<string, string | null>>({});

  useEffect(() => {
    const todayYmd = new Date().toISOString().slice(0, 10);
    supabase
      .from("khatib_jumat_schedule")
      .select("*")
      .eq("is_active", true)
      .gte("tanggal", todayYmd)
      .order("tanggal", { ascending: true })
      .then(({ data }) => {
        const rows = (data as KhatibJumatSchedule[]) ?? [];
        setItems(rows);
        setLoading(false);
        fetchHijriMap(rows.map((k) => k.tanggal)).then(setHijriMap);
      });
  }, []);

  const [terdekat, ...berikutnya] = items;
  const berikutnyaTampil = useMemo(() => berikutnya.slice(0, 4), [berikutnya]);

  return (
    <div>
      <h2 className="font-serif font-bold text-3xl text-primary-900 mb-6">Jadwal Khatib Jumat</h2>
      {loading && <p className="text-gray-400 text-lg">Memuat jadwal khatib...</p>}
      {!loading && !terdekat && <p className="text-gray-400 text-lg">Belum ada jadwal khatib Jumat mendatang.</p>}

      {terdekat && (
        <div className="rounded-3xl bg-gradient-to-br from-primary-700 to-primary-900 text-white p-8 mb-6 flex items-center gap-6 shadow-lg">
          <span className="h-24 w-24 shrink-0 rounded-full bg-white/15 flex items-center justify-center font-serif font-bold text-4xl">
            {terdekat.nama_ustadz.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-widest text-white/60 mb-1">Jumat Terdekat</p>
            <p className="font-serif font-bold text-3xl leading-tight truncate">{terdekat.nama_ustadz}</p>
            <p className="text-white/80 text-lg mt-1">
              {formatTanggal(terdekat.tanggal)}
              {hijriMap[terdekat.tanggal] && ` · ${hijriMap[terdekat.tanggal]}`}
            </p>
            <div className="flex items-center gap-2 mt-3">
              {terdekat.is_confirmed ? (
                <span className="badge bg-gold-500 text-primary-950">Sudah Dikonfirmasi</span>
              ) : (
                <span className="badge bg-white/15 text-white">Belum Dikonfirmasi</span>
              )}
              {terdekat.live_video_id && <span className="badge bg-red-500 text-white">🔴 LIVE</span>}
            </div>
          </div>
        </div>
      )}

      {berikutnyaTampil.length > 0 && (
        <div>
          <p className="text-sm uppercase tracking-widest text-gray-400 mb-3">Berikutnya</p>
          <div className="space-y-2.5">
            {berikutnyaTampil.map((k) => (
              <div key={k.id} className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-gray-50 px-5 py-4">
                <span className="h-12 w-12 shrink-0 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-serif font-bold text-lg">
                  {k.nama_ustadz.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-800 text-lg truncate">{k.nama_ustadz}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{formatTanggalPendek(k.tanggal)}</p>
                </div>
                {k.is_confirmed && <span className="badge bg-primary-100 text-primary-700 shrink-0">Terkonfirmasi</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
