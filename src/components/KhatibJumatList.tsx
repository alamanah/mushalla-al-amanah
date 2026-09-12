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
 * Card jadwal Khatib Jumat di beranda -- ditampilkan sebagai daftar ringkas
 * bergaya kartu (avatar inisial + nama + tanggal), mirip daftar artikel di
 * situs referensi. Cuma menampilkan jadwal pada bulan yang dipilih (default
 * bulan berjalan) lewat dropdown di pojok kanan atas. Tinggi card ditetapkan
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
      .order("tanggal", { ascending: false })
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
      <ul className="flex-1 min-h-0 overflow-y-auto space-y-1.5">
        {itemsBulanIni.map((k) => (
          <li key={k.id}>
            <div
              className="flex items-center gap-3 rounded-xl p-2.5 cursor-pointer border border-transparent hover:border-gray-100 hover:bg-gray-50 transition-colors"
              onClick={() => openYoutubeLink(resolveYoutubeLink(k))}
              title="Buka link YouTube"
            >
              <span className="h-11 w-11 shrink-0 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-serif font-bold text-base">
                {k.nama_ustadz.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-gray-800 truncate">{k.nama_ustadz}</p>
                  {k.live_video_id && <span className="badge bg-red-100 text-red-700 shrink-0">🔴 LIVE</span>}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {formatTanggal(k.tanggal)}
                  {hijriMap[k.tanggal] && ` · ${hijriMap[k.tanggal]}`}
                </p>
              </div>
            </div>
            {k.live_video_id && (
              <div className="mt-2 aspect-video rounded-lg overflow-hidden border border-gray-100">
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
