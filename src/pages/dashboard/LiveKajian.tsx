import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import { isYoutubeLiveConfigured } from "../../lib/youtube";
import { todayStr, useKajianLive } from "../../lib/useKajianLive";
import { KajianSchedule } from "../../types";

function formatTanggalPanjang(tgl: string) {
  const [y, m, d] = tgl.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("id-ID", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
}

function formatJamLog(t: string | null) {
  if (!t) return "-";
  return new Date(t).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

/**
 * Daftar jadwal kajian khusus HP: tinggal ketuk salah satu untuk mulai live
 * (buka YouTube Studio + catat log) tanpa perlu masuk ke Pengaturan Konten.
 * Sama seperti tab Jadwal Kajian di Dashboard, tapi dipersempit untuk aksi
 * live saja -- kelola jadwal (tambah/hapus/pamflet) tetap lewat Dashboard >
 * Pengaturan Konten > Jadwal Kajian.
 */
export default function LiveKajian() {
  const { isAdmin, hasRole } = useAuth();
  const canEdit = isAdmin || hasRole("humas");

  const [items, setItems] = useState<KajianSchedule[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () =>
    supabase
      .from("kajian_schedule")
      .select("*")
      .eq("is_active", true)
      .order("specific_date", { ascending: true, nullsFirst: false })
      .then(({ data }) => {
        setItems((data as KajianSchedule[]) ?? []);
        setLoading(false);
      });

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { pollingIds, startLive, checkLiveNow, endLive } = useKajianLive(items, load);

  if (!canEdit) {
    return (
      <div className="max-w-lg mx-auto mt-16 card text-center">
        <h2 className="text-lg font-semibold mb-2">Akses ditolak</h2>
        <p className="text-sm text-gray-600">Kamu tidak memiliki hak akses ke halaman ini.</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto pb-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-serif text-xl font-bold text-primary-900">Live Kajian</h1>
        <Link to="/dashboard/pengaturan" className="text-sm text-primary-700 hover:underline">
          Kelola Jadwal
        </Link>
      </div>

      {!isYoutubeLiveConfigured() && (
        <p className="text-xs text-yellow-600 mb-4">
          Deteksi otomatis Live YouTube belum aktif. Tombol "Mulai Live" tetap bisa dipakai untuk membuka YouTube
          Studio.
        </p>
      )}

      {loading && <p className="text-sm text-gray-400">Memuat jadwal kajian...</p>}
      {!loading && items.length === 0 && <p className="text-sm text-gray-400">Belum ada jadwal kajian yang aktif.</p>}

      <div className="space-y-2">
        {items.map((k) => {
          const isToday = k.specific_date === todayStr();
          const isPolling = pollingIds.has(k.id);
          return (
            <div key={k.id} className="card">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium text-gray-800">{k.title}</p>
                {k.live_video_id && <span className="badge bg-red-100 text-red-700">🔴 LIVE</span>}
                {isToday && <span className="badge bg-gold-500/20 text-gold-700">Hari ini</span>}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {k.specific_date ? formatTanggalPanjang(k.specific_date) : ""} · {k.time_text}{" "}
                {k.ustadz ? `· ${k.ustadz}` : ""}
              </p>
              {k.live_by_name && (
                <p className="text-xs text-gray-400 mt-0.5">
                  Live terakhir dimulai oleh {k.live_by_name}, {formatJamLog(k.live_started_at)}
                </p>
              )}
              <div className="flex gap-2 items-center mt-3">
                {k.live_video_id ? (
                  <button className="btn-secondary flex-1 text-sm" onClick={() => endLive(k)}>
                    Akhiri Live
                  </button>
                ) : (
                  <button
                    className="btn-primary flex-1 text-sm !bg-red-600 hover:!bg-red-700"
                    onClick={() => startLive(k)}
                  >
                    Mulai Live
                  </button>
                )}
                {isYoutubeLiveConfigured() && !k.live_video_id && (
                  <button
                    className="text-xs text-gray-500 hover:text-primary-700 shrink-0"
                    onClick={() => checkLiveNow(k)}
                    disabled={isPolling}
                  >
                    {isPolling ? "Mengecek..." : "Cek Status"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
