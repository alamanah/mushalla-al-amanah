import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { KajianSchedule } from "../types";

const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

function formatTanggal(tgl: string) {
  const [y, m, d] = tgl.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("id-ID", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
}

export default function KajianList() {
  const [items, setItems] = useState<KajianSchedule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("kajian_schedule")
      .select("*")
      .eq("is_active", true)
      .order("specific_date", { ascending: true, nullsFirst: false })
      .order("day_of_week", { ascending: true, nullsFirst: false })
      .then(({ data }) => {
        setItems((data as KajianSchedule[]) ?? []);
        setLoading(false);
      });
  }, []);

  return (
    <div className="card">
      <h3 className="font-serif font-bold text-lg text-primary-900 mb-4">Jadwal Kajian</h3>
      {loading && <p className="text-sm text-gray-400">Memuat jadwal kajian...</p>}
      {!loading && items.length === 0 && (
        <p className="text-sm text-gray-400">Belum ada jadwal kajian yang aktif.</p>
      )}
      <ul className="divide-y divide-gray-100">
        {items.map((k) => (
          <li key={k.id} className="py-3">
            <div className="flex flex-col sm:flex-row sm:items-start gap-3">
              <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-gray-800">{k.title}</p>
                    {k.live_video_id && <span className="badge bg-red-100 text-red-700">🔴 LIVE</span>}
                  </div>
                  <p className="text-sm text-gray-500">
                    {k.ustadz ? `Bersama ${k.ustadz}` : ""} {k.location ? `· ${k.location}` : ""}
                  </p>
                  {k.description && <p className="text-xs text-gray-400 mt-1">{k.description}</p>}
                </div>
                <div className="text-sm font-semibold text-primary-700 whitespace-nowrap">
                  {k.specific_date ? formatTanggal(k.specific_date) : k.day_of_week !== null ? HARI[k.day_of_week] : ""} ·{" "}
                  {k.time_text}
                </div>
              </div>
              {k.foto_url && (
                <img
                  src={k.foto_url}
                  alt=""
                  className="h-20 w-20 rounded-lg object-cover border border-gray-100 shrink-0 order-first sm:order-last"
                />
              )}
            </div>
            {k.live_video_id && (
              <div className="mt-3 aspect-video rounded-lg overflow-hidden border border-gray-100">
                <iframe
                  src={`https://www.youtube.com/embed/${k.live_video_id}`}
                  title={`Live: ${k.title}`}
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
