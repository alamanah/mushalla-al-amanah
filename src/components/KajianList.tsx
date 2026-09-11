import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { driveImageUrl } from "../lib/driveLink";
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
          <li key={k.id} className="py-4">
            <div className="flex flex-col sm:flex-row gap-4">
              {k.foto_url && (
                <img
                  src={driveImageUrl(k.foto_url) ?? undefined}
                  alt=""
                  className="w-32 h-40 sm:w-36 sm:h-44 rounded-lg object-cover border border-gray-100 shrink-0 mx-auto sm:mx-0 sm:order-1"
                />
              )}
              <div className="flex-1 min-w-0 sm:order-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-gray-800">{k.title}</p>
                  {k.live_video_id && <span className="badge bg-red-100 text-red-700">🔴 LIVE</span>}
                </div>
                <p className="text-sm font-semibold text-primary-700 mt-0.5">
                  {k.specific_date ? formatTanggal(k.specific_date) : k.day_of_week !== null ? HARI[k.day_of_week] : ""} ·{" "}
                  {k.time_text}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {k.ustadz ? `Bersama ${k.ustadz}` : ""} {k.location ? `· ${k.location}` : ""}
                </p>
                {k.description && <p className="text-xs text-gray-400 mt-1">{k.description}</p>}
              </div>
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
