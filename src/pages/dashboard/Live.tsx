import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import { isYoutubeLiveConfigured } from "../../lib/youtube";
import { todayStr, useKajianLive } from "../../lib/useKajianLive";
import { KajianSchedule, KhatibJumatSchedule } from "../../types";

const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

function formatTanggalPanjang(tgl: string) {
  const [y, m, d] = tgl.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("id-ID", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
}

function formatJamLog(t: string | null) {
  if (!t) return "-";
  return new Date(t).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

/**
 * Daftar kajian & khutbah Jumat khusus HP: tinggal ketuk salah satu untuk
 * mulai live (buka YouTube Studio + catat log) tanpa perlu masuk ke
 * Pengaturan Konten. Cuma menampilkan jadwal HARI INI -- kajian tanggal
 * spesifik atau rutin mingguan yang jatuh hari ini, dan khutbah Jumat kalau
 * hari ini kebetulan Jumat -- karena halaman ini memang dipakai persis
 * sebelum/saat kegiatannya berlangsung, bukan untuk melihat jadwal ke depan
 * (itu tetap lewat Dashboard > Pengaturan Konten > Kelola Jadwal).
 */
export default function Live() {
  const { isAdmin, hasRole } = useAuth();
  const canEdit = isAdmin || hasRole("humas");

  const [kajianItems, setKajianItems] = useState<KajianSchedule[]>([]);
  const [khatibItems, setKhatibItems] = useState<KhatibJumatSchedule[]>([]);
  const [loading, setLoading] = useState(true);

  const loadKajian = () =>
    supabase
      .from("kajian_schedule")
      .select("*")
      .eq("is_active", true)
      .then(({ data }) => setKajianItems((data as KajianSchedule[]) ?? []));

  const loadKhatib = () =>
    supabase
      .from("khatib_jumat_schedule")
      .select("*")
      .eq("is_active", true)
      .then(({ data }) => setKhatibItems((data as KhatibJumatSchedule[]) ?? []));

  useEffect(() => {
    Promise.all([loadKajian(), loadKhatib()]).then(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const today = todayStr();
  const todayDow = new Date().getDay(); // 0=Minggu ... 6=Sabtu, sama seperti day_of_week

  // Cuma jadwal HARI INI -- tanggal spesifik yang jatuh hari ini, atau
  // kajian rutin mingguan (tanpa tanggal spesifik) yang harinya cocok.
  const kajianHariIni = kajianItems.filter(
    (k) => k.specific_date === today || (!k.specific_date && k.day_of_week === todayDow)
  );
  const khatibHariIni = khatibItems.filter((k) => k.tanggal === today);

  const {
    pollingIds: kajianPolling,
    startLive: startKajianLive,
    checkLiveNow: checkKajianLive,
    endLive: endKajianLive,
  } = useKajianLive("kajian_schedule", kajianItems, loadKajian, (k) => k.specific_date);

  const {
    pollingIds: khatibPolling,
    startLive: startKhatibLive,
    checkLiveNow: checkKhatibLive,
    endLive: endKhatibLive,
  } = useKajianLive("khatib_jumat_schedule", khatibItems, loadKhatib, (k) => k.tanggal);

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
        <h1 className="font-serif text-xl font-bold text-primary-900">Live</h1>
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

      {loading && <p className="text-sm text-gray-400">Memuat jadwal hari ini...</p>}

      {!loading && kajianHariIni.length === 0 && khatibHariIni.length === 0 && (
        <p className="text-sm text-gray-400">Tidak ada kajian atau khutbah Jumat hari ini.</p>
      )}

      {!loading && kajianHariIni.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Kajian Hari Ini</h2>
          <div className="space-y-2">
            {kajianHariIni.map((k) => {
              const isPolling = kajianPolling.has(k.id);
              return (
                <div key={k.id} className="card">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-gray-800">{k.title}</p>
                    {k.live_video_id && <span className="badge bg-red-100 text-red-700">🔴 LIVE</span>}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {k.specific_date ? formatTanggalPanjang(k.specific_date) : HARI[todayDow]} · {k.time_text}{" "}
                    {k.ustadz ? `· ${k.ustadz}` : ""}
                  </p>
                  {k.live_by_name && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      Live terakhir dimulai oleh {k.live_by_name}, {formatJamLog(k.live_started_at)}
                    </p>
                  )}
                  <div className="flex gap-2 items-center mt-3">
                    {k.live_video_id ? (
                      <button className="btn-secondary flex-1 text-sm" onClick={() => endKajianLive(k)}>
                        Akhiri Live
                      </button>
                    ) : (
                      <button
                        className="btn-primary flex-1 text-sm !bg-red-600 hover:!bg-red-700"
                        onClick={() => startKajianLive(k)}
                      >
                        Mulai Live
                      </button>
                    )}
                    {isYoutubeLiveConfigured() && !k.live_video_id && (
                      <button
                        className="text-xs text-gray-500 hover:text-primary-700 shrink-0"
                        onClick={() => checkKajianLive(k)}
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
      )}

      {!loading && khatibHariIni.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Khutbah Jumat Hari Ini</h2>
          <div className="space-y-2">
            {khatibHariIni.map((k) => {
              const isPolling = khatibPolling.has(k.id);
              return (
                <div key={k.id} className="card">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-gray-800">{k.nama_ustadz}</p>
                    {k.live_video_id && <span className="badge bg-red-100 text-red-700">🔴 LIVE</span>}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{formatTanggalPanjang(k.tanggal)}</p>
                  {k.live_by_name && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      Live terakhir dimulai oleh {k.live_by_name}, {formatJamLog(k.live_started_at)}
                    </p>
                  )}
                  <div className="flex gap-2 items-center mt-3">
                    {k.live_video_id ? (
                      <button className="btn-secondary flex-1 text-sm" onClick={() => endKhatibLive(k)}>
                        Akhiri Live
                      </button>
                    ) : (
                      <button
                        className="btn-primary flex-1 text-sm !bg-red-600 hover:!bg-red-700"
                        onClick={() => startKhatibLive(k)}
                      >
                        Mulai Live
                      </button>
                    )}
                    {isYoutubeLiveConfigured() && !k.live_video_id && (
                      <button
                        className="text-xs text-gray-500 hover:text-primary-700 shrink-0"
                        onClick={() => checkKhatibLive(k)}
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
      )}
    </div>
  );
}
