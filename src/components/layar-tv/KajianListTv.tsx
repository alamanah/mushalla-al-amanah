import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { bulanKeyDari, bulanKeySekarang } from "../../lib/bulanFilter";
import { KajianSchedule } from "../../types";

const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

function formatTanggalPendek(tgl: string) {
  const [y, m, d] = tgl.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("id-ID", { day: "2-digit", month: "long" });
}

/**
 * Versi "list" Jadwal Kajian khusus halaman Layar TV (src/pages/LayarTv.tsx)
 * -- beda dari KajianList.tsx di beranda yang bergaya carousel 1 kartu +
 * foto latar, di sini SEMUA jadwal kajian bulan berjalan langsung tampil
 * sekaligus sebagai daftar, supaya lebih cepat dibaca sambil lalu di layar
 * TV (tidak ada yang menunggu carousel-nya berputar).
 */
export default function KajianListTv() {
  const [items, setItems] = useState<KajianSchedule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("kajian_schedule")
      .select("*")
      .eq("is_active", true)
      .order("specific_date", { ascending: true, nullsFirst: true })
      .order("day_of_week", { ascending: true, nullsFirst: true })
      .then(({ data }) => {
        setItems((data as KajianSchedule[]) ?? []);
        setLoading(false);
      });
  }, []);

  const bulan = bulanKeySekarang();
  const itemsBulanIni = useMemo(
    () => items.filter((k) => !k.specific_date || bulanKeyDari(k.specific_date) === bulan),
    [items, bulan]
  );

  return (
    <div>
      <h2 className="font-serif font-bold text-3xl text-primary-900 mb-6">Jadwal Kajian</h2>
      {loading && <p className="text-gray-400 text-lg">Memuat jadwal kajian...</p>}
      {!loading && itemsBulanIni.length === 0 && (
        <p className="text-gray-400 text-lg">Belum ada jadwal kajian bulan ini.</p>
      )}
      <div className="space-y-3">
        {itemsBulanIni.map((k) => (
          <div
            key={k.id}
            className="flex items-center gap-5 rounded-2xl border border-gray-100 bg-gray-50 px-6 py-5"
          >
            <div className="shrink-0 rounded-xl bg-primary-700 text-white px-5 py-3 text-center min-w-[110px]">
              <p className="text-[11px] uppercase tracking-wide opacity-80">{k.specific_date ? "" : "Setiap"}</p>
              <p className="font-bold text-lg leading-tight">
                {k.specific_date ? formatTanggalPendek(k.specific_date) : k.day_of_week !== null ? HARI[k.day_of_week] : "-"}
              </p>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-gray-800 text-xl truncate">{k.title}</p>
                {k.live_video_id && <span className="badge bg-red-100 text-red-700 shrink-0">🔴 LIVE</span>}
              </div>
              <p className="text-base text-gray-500 mt-1">
                {k.time_text}
                {k.ustadz ? ` · Bersama ${k.ustadz}` : ""}
                {k.location ? ` · ${k.location}` : ""}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
