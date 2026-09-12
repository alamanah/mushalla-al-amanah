import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { fetchHijriMap } from "../lib/prayerTimes";
import { bulanKeyDari, bulanKeySekarang, bulanOptionsDari, labelBulan } from "../lib/bulanFilter";
import { openYoutubeLink, resolveYoutubeLink } from "../lib/youtubeLink";
import { KhatibJumatSchedule } from "../types";

function formatTanggal(tgl: string) {
  const [y, m, d] = tgl.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("id-ID", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
}

/**
 * Card jadwal Khatib Jumat di beranda -- sengaja dibuat ringkas (hanya nama
 * ustadz & tanggal khutbah), beda dari card Jadwal Kajian yang lebih
 * lengkap. Cuma menampilkan jadwal pada bulan yang dipilih (default bulan
 * berjalan) lewat dropdown di pojok kanan atas. Tinggi card ditetapkan
 * tetap (sama persis dengan card Jadwal Kajian, lihat KajianList.tsx) supaya
 * keduanya sejajar rapi tanpa saling bergantung -- kalau isinya lebih
 * panjang, daftarnya scroll sendiri.
 */
export default function KhatibJumatList() {
  const [items, setItems] = useState<KhatibJumatSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [hijriMap, setHijriMap] = useState<Record<string, string | null>>({});
  const [bulan, setBulan] = useState(bulanKeySekarang());

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

  const bulanOptions = useMemo(() => bulanOptionsDari(items.map((k) => k.tanggal)), [items]);
  const itemsBulanIni = useMemo(() => items.filter((k) => bulanKeyDari(k.tanggal) === bulan), [items, bulan]);

  return (
    <div className="card flex flex-col md:h-[460px]">
      <div className="flex items-center justify-between gap-2 mb-4 flex-wrap shrink-0">
        <h3 className="font-serif font-bold text-lg text-primary-900">Jadwal Khatib Jumat</h3>
        <select className="input !w-auto !py-1 !text-xs" value={bulan} onChange={(e) => setBulan(e.target.value)}>
          {bulanOptions.map((b) => (
            <option key={b} value={b}>
              {labelBulan(b)}
            </option>
          ))}
        </select>
      </div>
      {loading && <p className="text-sm text-gray-400">Memuat jadwal khatib...</p>}
      {!loading && itemsBulanIni.length === 0 && (
        <p className="text-sm text-gray-400">Belum ada jadwal khatib Jumat pada bulan ini.</p>
      )}
      <ul className="divide-y divide-gray-100 flex-1 min-h-0 overflow-y-auto">
        {itemsBulanIni.map((k) => (
          <li key={k.id} className="py-3">
            <div
              className="cursor-pointer -m-2 p-2 rounded-lg hover:bg-gray-50 transition-colors"
              onClick={() => openYoutubeLink(resolveYoutubeLink(k))}
              title="Buka link YouTube"
            >
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium text-gray-800">{k.nama_ustadz}</p>
                {k.live_video_id && <span className="badge bg-red-100 text-red-700">🔴 LIVE</span>}
              </div>
              <p className="text-sm font-semibold text-primary-700 mt-0.5">
                {formatTanggal(k.tanggal)}
                {hijriMap[k.tanggal] && ` · ${hijriMap[k.tanggal]}`}
              </p>
            </div>
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
