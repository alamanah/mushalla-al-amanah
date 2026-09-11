import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { KajianSchedule, KhatibJumatSchedule } from "../types";

type AgendaItem =
  | { tipe: "kajian"; tanggal: string; data: KajianSchedule }
  | { tipe: "khatib"; tanggal: string; data: KhatibJumatSchedule };

function formatTanggal(tgl: string) {
  const [y, m, d] = tgl.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("id-ID", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
}

/**
 * Halaman Kalender publik: gabungan Jadwal Kajian + Jadwal Khatib Jumat,
 * diurutkan berdasarkan tanggal, supaya jamaah bisa lihat semua agenda
 * mushalla dalam satu tempat. Kajian tanpa tanggal spesifik (jadwal
 * mingguan berdasar hari) ditampilkan di bagian tersendiri di bawah.
 */
export default function Calendar() {
  const [items, setItems] = useState<AgendaItem[]>([]);
  const [kajianMingguan, setKajianMingguan] = useState<KajianSchedule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from("kajian_schedule").select("*").eq("is_active", true),
      supabase.from("khatib_jumat_schedule").select("*").eq("is_active", true),
    ]).then(([kajianRes, khatibRes]) => {
      const kajian = (kajianRes.data as KajianSchedule[]) ?? [];
      const khatib = (khatibRes.data as KhatibJumatSchedule[]) ?? [];

      const kajianDenganTanggal = kajian.filter((k): k is KajianSchedule & { specific_date: string } => !!k.specific_date);
      setKajianMingguan(kajian.filter((k) => !k.specific_date));

      const gabungan: AgendaItem[] = [
        ...kajianDenganTanggal.map((k) => ({ tipe: "kajian" as const, tanggal: k.specific_date, data: k })),
        ...khatib.map((k) => ({ tipe: "khatib" as const, tanggal: k.tanggal, data: k })),
      ].sort((a, b) => a.tanggal.localeCompare(b.tanggal));

      setItems(gabungan);
      setLoading(false);
    });
  }, []);

  const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="font-serif text-2xl font-bold text-primary-900 mb-1">Kalender Kegiatan</h1>
      <p className="text-sm text-gray-500 mb-6">Jadwal Kajian dan Khatib Jumat Mushalla Al Amanah.</p>

      {loading && <p className="text-sm text-gray-400">Memuat kalender...</p>}
      {!loading && items.length === 0 && <p className="text-sm text-gray-400">Belum ada agenda mendatang.</p>}

      <ul className="divide-y divide-gray-100 card">
        {items.map((item, i) => (
          <li key={`${item.tipe}-${item.data.id}-${i}`} className="py-4 flex items-start gap-3">
            <span
              className={`badge shrink-0 ${
                item.tipe === "kajian" ? "bg-primary-100 text-primary-700" : "bg-gold-500/20 text-gold-700"
              }`}
            >
              {item.tipe === "kajian" ? "Kajian" : "Khatib Jumat"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-primary-700">{formatTanggal(item.tanggal)}</p>
              {item.tipe === "kajian" ? (
                <>
                  <p className="font-medium text-gray-800">{item.data.title}</p>
                  <p className="text-sm text-gray-500">
                    {item.data.time_text} {item.data.ustadz ? `· ${item.data.ustadz}` : ""}{" "}
                    {item.data.location ? `· ${item.data.location}` : ""}
                  </p>
                </>
              ) : (
                <p className="font-medium text-gray-800">{item.data.nama_ustadz}</p>
              )}
              {(item.data.live_video_id) && <span className="badge bg-red-100 text-red-700 mt-1 inline-block">🔴 LIVE</span>}
            </div>
          </li>
        ))}
      </ul>

      {kajianMingguan.length > 0 && (
        <div className="mt-8">
          <h2 className="font-serif font-bold text-lg text-primary-900 mb-3">Kajian Rutin Mingguan</h2>
          <ul className="divide-y divide-gray-100 card">
            {kajianMingguan.map((k) => (
              <li key={k.id} className="py-3">
                <p className="font-medium text-gray-800">{k.title}</p>
                <p className="text-sm text-gray-500">
                  {k.day_of_week !== null ? HARI[k.day_of_week] : ""} · {k.time_text} {k.ustadz ? `· ${k.ustadz}` : ""}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
