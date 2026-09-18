import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { fetchHijriDateID, fetchPrayerTimes } from "../../lib/prayerTimes";
import { buildLaporanJumatText, tanggalJumatDefault } from "../../lib/laporanJumat";
import { LaporanKeuanganResult } from "../../lib/laporanKeuangan";
import { KhatibJumatSchedule, PrayerOverride } from "../../types";

interface Props {
  laporan: LaporanKeuanganResult;
  onClose: () => void;
}

/**
 * Modal "Buat Laporan Jumat" -- tombolnya ada di LaporanKeuanganTab.tsx
 * (khusus dashboard, showControls=true). Menyusun teks pengumuman mingguan
 * siap-tempel (mis. utk broadcast WhatsApp) yang menggabungkan Laporan
 * Keuangan periode yang sedang dilihat + petugas Sholat Jumat (Khotib/Imam/
 * Muadzin, dari Dashboard > Pengaturan Konten > Jadwal Khatib Jumat) +
 * jadwal waktu sholat Jumat -- lihat src/lib/laporanJumat.ts utk detail
 * formatnya. Hasilnya tetap bisa diedit bebas sebelum disalin.
 */
export default function LaporanJumatModal({ laporan, onClose }: Props) {
  const [tanggalJumat, setTanggalJumat] = useState(tanggalJumatDefault());
  const [khatib, setKhatib] = useState<KhatibJumatSchedule | null>(null);
  const [hijri, setHijri] = useState<string | null>(null);
  const [waktuJumat, setWaktuJumat] = useState<string | null>(null);
  const [loadingAux, setLoadingAux] = useState(true);
  const [text, setText] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoadingAux(true);
    setCopied(false);
    const [y, m, d] = tanggalJumat.split("-").map(Number);
    const tanggalDate = new Date(y, m - 1, d);

    Promise.allSettled([
      supabase.from("khatib_jumat_schedule").select("*").eq("tanggal", tanggalJumat).maybeSingle(),
      supabase.from("prayer_schedule_override").select("*").eq("date", tanggalJumat).maybeSingle(),
      fetchHijriDateID(tanggalDate),
      fetchPrayerTimes(tanggalDate),
    ]).then(([khatibRes, overrideRes, hijriRes, timesRes]) => {
      if (!alive) return;
      const khatibRow =
        khatibRes.status === "fulfilled" ? (khatibRes.value.data as KhatibJumatSchedule | null) : null;
      const overrideRow =
        overrideRes.status === "fulfilled" ? (overrideRes.value.data as PrayerOverride | null) : null;
      const hijriVal = hijriRes.status === "fulfilled" ? hijriRes.value : null;
      const dzuhur = timesRes.status === "fulfilled" ? timesRes.value.dzuhur : null;

      setKhatib(khatibRow);
      setHijri(hijriVal);
      const waktu = overrideRow?.jumat || dzuhur || null;
      setWaktuJumat(waktu);

      setText(
        buildLaporanJumatText({
          laporan,
          tanggalJumat,
          hijri: hijriVal,
          waktuJumat: waktu,
          namaKhotib: khatibRow?.nama_ustadz ?? null,
          namaImam: khatibRow?.imam ?? null,
          namaMuadzin: khatibRow?.muadzin ?? null,
        })
      );
      setLoadingAux(false);
    });

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tanggalJumat, laporan]);

  const buatUlang = () => {
    setText(
      buildLaporanJumatText({
        laporan,
        tanggalJumat,
        hijri,
        waktuJumat,
        namaKhotib: khatib?.nama_ustadz ?? null,
        namaImam: khatib?.imam ?? null,
        namaMuadzin: khatib?.muadzin ?? null,
      })
    );
  };

  const salinTeks = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API bisa gagal (mis. browser lawas/tidak izinkan) -- teks
      // tetap ada di textarea, jadi masih bisa dipilih & disalin manual.
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="card max-w-2xl w-full max-h-[90vh] flex flex-col">
        <div className="flex items-start justify-between gap-3 mb-1">
          <h3 className="font-serif font-bold text-lg text-primary-900">Buat Laporan Jumat</h3>
          <button className="text-gray-400 hover:text-gray-600 text-xl leading-none" onClick={onClose}>
            &times;
          </button>
        </div>
        <p className="text-xs text-gray-500 mb-3">
          Teks pengumuman mingguan siap-tempel (mis. utk broadcast WhatsApp) -- Laporan Keuangan periode{" "}
          <span className="font-medium text-gray-700">{laporan.periode}</span> yang sedang dilihat, digabung dengan
          petugas Sholat Jumat & jadwal waktunya. Bisa diedit bebas sebelum disalin.
        </p>

        <div className="flex flex-wrap items-end gap-3 mb-3">
          <div>
            <label className="label">Tanggal Jumat</label>
            <input
              type="date"
              className="input"
              value={tanggalJumat}
              onChange={(e) => setTanggalJumat(e.target.value)}
            />
          </div>
          {!loadingAux && !khatib && (
            <p className="text-xs text-yellow-600">
              Belum ada jadwal Khatib Jumat untuk tanggal ini -- isi dulu di tab "Jadwal Khatib Jumat" kalau perlu,
              atau lengkapi manual langsung di teksnya.
            </p>
          )}
          <button className="btn-secondary text-sm ml-auto" disabled={loadingAux} onClick={buatUlang}>
            🔄 Buat Ulang dari Data
          </button>
        </div>

        <textarea
          className="input flex-1 min-h-[320px] font-mono text-xs leading-relaxed resize-none"
          value={loadingAux ? "Memuat data..." : text}
          onChange={(e) => setText(e.target.value)}
          disabled={loadingAux}
        />

        <div className="flex gap-2 mt-3">
          <button className="btn-primary flex-1" disabled={loadingAux} onClick={salinTeks}>
            {copied ? "✅ Tersalin!" : "📋 Salin Teks"}
          </button>
          <button className="btn-secondary" onClick={onClose}>
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
