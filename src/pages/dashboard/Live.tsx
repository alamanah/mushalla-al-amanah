import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabaseClient";
import { findVideosByDate, isYoutubeLiveConfigured, YoutubeVideoCandidate } from "../../lib/youtube";
import { bulanKeyDari, bulanKeySekarang, bulanOptionsDari, labelBulan } from "../../lib/bulanFilter";
import { todayStr } from "../../lib/useKajianLive";
import { KajianSchedule, KhatibJumatSchedule } from "../../types";

type Jenis = "kajian" | "khatib";

interface Entry {
  jenis: Jenis;
  id: string;
  judul: string;
  /** Tanggal kegiatan -- dipakai sebagai isian awal "Tanggal video" (bisa
   * diubah admin sebelum "Ambil Link"). Kajian rutin (tanpa specific_date)
   * tidak punya satu tanggal pasti, jadi dipakaikan hari ini sbg default. */
  tanggal: string;
  linkYoutube: string | null;
}

function formatTanggal(tgl: string) {
  const [y, m, d] = tgl.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("id-ID", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
}

function formatJamPublish(iso: string) {
  return (
    new Date(iso).toLocaleString("id-ID", {
      timeZone: "Asia/Makassar",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }) + " WITA"
  );
}

/**
 * Dashboard > Live -- BUKAN lagi buat memulai siaran langsung (itu tetap
 * lewat halaman App/PWA di HP > Live, lihat AppLive.tsx & LiveScheduleList.tsx,
 * yang membuka aplikasi YouTube di HP -- terbukti lancar dipakai). Menu ini
 * di dashboard/desktop diubah fungsinya jadi "Ambil Link YouTube": mencari
 * video yang sudah di-upload ke channel Mushalla Al Amanah berdasarkan
 * TANGGAL kajian/khutbahnya (lihat findVideosByDate di lib/youtube.ts),
 * lalu mengisi otomatis kolom "Link YouTube" jadwal terkait -- supaya admin
 * tidak perlu bolak-balik salin link secara manual dari YouTube Studio.
 */
export default function Live() {
  const { isAdmin, hasRole } = useAuth();
  const canEdit = isAdmin || hasRole("humas");

  const [loading, setLoading] = useState(true);
  const [kajianList, setKajianList] = useState<KajianSchedule[]>([]);
  const [khatibList, setKhatibList] = useState<KhatibJumatSchedule[]>([]);
  const [bulan, setBulan] = useState(bulanKeySekarang());

  // Tanggal pencarian per entry (key: "jenis:id") -- default ikut tanggal
  // kegiatannya, tapi bisa diubah admin sebelum klik "Ambil Link".
  const [tanggalCari, setTanggalCari] = useState<Record<string, string>>({});
  // Hasil pencarian per entry -- belum ada key = belum pernah dicari,
  // array kosong = sudah dicari tapi tidak ketemu.
  const [hasil, setHasil] = useState<Record<string, YoutubeVideoCandidate[]>>({});
  const [mencari, setMencari] = useState<Set<string>>(new Set());
  const [menyimpan, setMenyimpan] = useState<Set<string>>(new Set());

  const load = () => {
    setLoading(true);
    Promise.all([
      supabase.from("kajian_schedule").select("*").eq("is_active", true).order("specific_date", { ascending: false }),
      supabase.from("khatib_jumat_schedule").select("*").eq("is_active", true).order("tanggal", { ascending: false }),
    ]).then(([kajian, khatib]) => {
      setKajianList((kajian.data as KajianSchedule[]) ?? []);
      setKhatibList((khatib.data as KhatibJumatSchedule[]) ?? []);
      setLoading(false);
    });
  };

  useEffect(() => {
    load();
  }, []);

  if (!canEdit) {
    return (
      <div className="max-w-lg mx-auto mt-16 card text-center">
        <h2 className="text-lg font-semibold mb-2">Akses ditolak</h2>
        <p className="text-sm text-gray-600">Kamu tidak memiliki hak akses ke halaman ini.</p>
      </div>
    );
  }

  const entries: Entry[] = [
    ...kajianList.map((k): Entry => ({
      jenis: "kajian",
      id: k.id,
      judul: k.title,
      tanggal: k.specific_date ?? todayStr(),
      linkYoutube: k.link_youtube,
    })),
    ...khatibList.map((k): Entry => ({
      jenis: "khatib",
      id: k.id,
      judul: `Khutbah Jumat -- ${k.nama_ustadz}`,
      tanggal: k.tanggal,
      linkYoutube: k.link_youtube,
    })),
  ];

  const bulanOptions = bulanOptionsDari(entries.map((e) => e.tanggal));
  const entriesBulanIni = entries.filter((e) => bulanKeyDari(e.tanggal) === bulan);

  const keyOf = (e: Entry) => `${e.jenis}:${e.id}`;

  const cari = async (e: Entry) => {
    const key = keyOf(e);
    const tanggal = tanggalCari[key] ?? e.tanggal;
    setMencari((s) => new Set(s).add(key));
    const list = await findVideosByDate(tanggal);
    setMencari((s) => {
      const n = new Set(s);
      n.delete(key);
      return n;
    });
    setHasil((h) => ({ ...h, [key]: list }));
  };

  const pakai = async (e: Entry, videoId: string) => {
    const key = keyOf(e);
    setMenyimpan((s) => new Set(s).add(key));
    const table = e.jenis === "kajian" ? "kajian_schedule" : "khatib_jumat_schedule";
    const link = `https://www.youtube.com/watch?v=${videoId}`;
    const { error } = await supabase.from(table).update({ link_youtube: link }).eq("id", e.id);
    setMenyimpan((s) => {
      const n = new Set(s);
      n.delete(key);
      return n;
    });
    if (error) {
      alert("Gagal menyimpan link: " + error.message);
      return;
    }
    setHasil((h) => {
      const n = { ...h };
      delete n[key];
      return n;
    });
    load();
  };

  return (
    <div className="max-w-2xl mx-auto pb-6">
      <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
        <h1 className="font-serif text-xl font-bold text-primary-900">Live</h1>
        <Link to="/dashboard/pengaturan" className="text-sm text-primary-700 hover:underline">
          Kelola Jadwal
        </Link>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Ambil link video YouTube kajian/khutbah Jumat otomatis berdasarkan tanggal -- tidak perlu salin manual dari
        YouTube Studio.
      </p>

      {!isYoutubeLiveConfigured() && (
        <p className="text-xs text-yellow-600 mb-4">
          Pencarian otomatis belum aktif -- perlu VITE_YOUTUBE_API_KEY & VITE_YOUTUBE_CHANNEL_ID (lihat
          supabase/SETUP.md).
        </p>
      )}

      <div className="flex justify-end mb-3">
        <select className="input !w-auto !py-1 !text-xs" value={bulan} onChange={(e) => setBulan(e.target.value)}>
          {bulanOptions.map((b) => (
            <option key={b} value={b}>
              {labelBulan(b)}
            </option>
          ))}
        </select>
      </div>

      {loading && <p className="text-sm text-gray-400">Memuat jadwal...</p>}
      {!loading && entriesBulanIni.length === 0 && (
        <p className="text-sm text-gray-400">Belum ada jadwal kajian/khutbah Jumat pada bulan ini.</p>
      )}

      <div className="space-y-3">
        {entriesBulanIni.map((e) => {
          const key = keyOf(e);
          const tanggal = tanggalCari[key] ?? e.tanggal;
          const daftarHasil = hasil[key];
          const sedangCari = mencari.has(key);
          const sedangSimpan = menyimpan.has(key);
          return (
            <div key={key} className="card">
              <p className="font-medium text-gray-800">{e.judul}</p>
              <p className="text-xs text-gray-500 mb-2">
                {e.jenis === "kajian" ? "Kajian" : "Khutbah Jumat"} &middot; {formatTanggal(e.tanggal)}
              </p>
              {e.linkYoutube && (
                <a
                  href={e.linkYoutube}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-primary-700 hover:underline break-all"
                >
                  🔗 {e.linkYoutube}
                </a>
              )}
              <div className="flex flex-wrap items-end gap-2 mt-2">
                <div>
                  <label className="label">Tanggal video</label>
                  <input
                    type="date"
                    className="input !py-1 !text-xs"
                    value={tanggal}
                    onChange={(ev) => setTanggalCari((t) => ({ ...t, [key]: ev.target.value }))}
                  />
                </div>
                <button
                  className="btn-secondary text-sm"
                  disabled={sedangCari || !isYoutubeLiveConfigured()}
                  onClick={() => cari(e)}
                >
                  {sedangCari ? "Mencari..." : e.linkYoutube ? "🔗 Cari Ulang" : "🔗 Ambil Link"}
                </button>
              </div>

              {daftarHasil &&
                (daftarHasil.length === 0 ? (
                  <p className="text-xs text-yellow-600 mt-2">Tidak ditemukan video pada tanggal ini.</p>
                ) : (
                  <div className="mt-2 space-y-1.5">
                    {daftarHasil.map((v) => (
                      <div
                        key={v.videoId}
                        className="flex items-center justify-between gap-2 bg-gray-50 rounded-lg px-2.5 py-1.5"
                      >
                        <div className="min-w-0">
                          <p className="text-xs text-gray-700 truncate">{v.title}</p>
                          <p className="text-[10px] text-gray-400">{formatJamPublish(v.publishedAt)}</p>
                        </div>
                        <button
                          className="btn-primary !py-1 !px-2.5 text-xs shrink-0"
                          disabled={sedangSimpan}
                          onClick={() => pakai(e, v.videoId)}
                        >
                          {sedangSimpan ? "..." : "Pakai"}
                        </button>
                      </div>
                    ))}
                  </div>
                ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
