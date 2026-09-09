import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { KajianSchedule } from "../types";

const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

export default function KajianList() {
  const [items, setItems] = useState<KajianSchedule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("kajian_schedule")
      .select("*")
      .eq("is_active", true)
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
          <li key={k.id} className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
            <div>
              <p className="font-medium text-gray-800">{k.title}</p>
              <p className="text-sm text-gray-500">
                {k.ustadz ? `Bersama ${k.ustadz}` : ""} {k.location ? `· ${k.location}` : ""}
              </p>
              {k.description && <p className="text-xs text-gray-400 mt-1">{k.description}</p>}
            </div>
            <div className="text-sm font-semibold text-primary-700 whitespace-nowrap">
              {k.day_of_week !== null ? HARI[k.day_of_week] : k.specific_date} · {k.time_text}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
