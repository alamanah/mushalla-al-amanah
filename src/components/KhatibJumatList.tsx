import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { fetchHijriMap } from "../lib/prayerTimes";
import { KhatibJumatSchedule } from "../types";

function formatTanggal(tgl: string) {
  const [y, m, d] = tgl.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("id-ID", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
}

/** Card jadwal Khatib Jumat di beranda -- sengaja dibuat ringkas (hanya nama
 * ustadz & tanggal khutbah), beda dari card Jadwal Kajian yang lebih lengkap. */
export default function KhatibJumatList() {
  const [items, setItems] = useState<KhatibJumatSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [hijriMap, setHijriMap] = useState<Record<string, string | null>>({});

  useEffect(() => {
    supabase
      .from("khatib_jumat_schedule")
      .select("*")
      .eq("is_active", true)
      .order("tanggal", { ascending: true })
      .then(({ data }) => {
        const rows = (data as KhatibJumatSchedule[]) ?? [];
        setItems(rows);
        setLoading(false);
        fetchHijriMap(rows.map((k) => k.tanggal)).then(setHijriMap);
      });
  }, []);

  return (
    <div className="card">
      <h3 className="font-serif font-bold text-lg text-primary-900 mb-4">Jadwal Khatib Jumat</h3>
      {loading && <p className="text-sm text-gray-400">Memuat jadwal khatib...</p>}
      {!loading && items.length === 0 && (
        <p className="text-sm text-gray-400">Belum ada jadwal khatib Jumat yang aktif.</p>
      )}
      <ul className="divide-y divide-gray-100">
        {items.map((k) => (
          <li key={k.id} className="py-3">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-medium text-gray-800">{k.nama_ustadz}</p>
              {k.live_video_id && <span className="badge bg-red-100 text-red-700">🔴 LIVE</span>}
            </div>
            <p className="text-sm font-semibold text-primary-700 mt-0.5">
              {formatTanggal(k.tanggal)}
              {hijriMap[k.tanggal] && ` · ${hijriMap[k.tanggal]}`}
            </p>
            {k.live_video_id && (
              <div className="mt-3 aspect-video rounded-lg overflow-hidden border border-gray-100">
                <iframe
                  src={`https://www.youtube.com/embed/${k.live_video_id}`}
                  title={`Live Khatib: ${k.nama_ustadz}`}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
