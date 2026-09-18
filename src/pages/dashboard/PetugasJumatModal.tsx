import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { fetchHijriDateID, fetchPrayerTimes } from "../../lib/prayerTimes";
import { buildPetugasJumatText } from "../../lib/laporanJumat";
import { KhatibJumatSchedule, PrayerOverride } from "../../types";

interface Props {
  khatib: KhatibJumatSchedule;
  onClose: () => void;
}

function formatTanggalPanjang(tanggal: string): string {
  const [y, m, d] = tanggal.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

/**
 * Modal "Bagikan Petugas Jumat" -- tombolnya ada di Dashboard > menu
 * "Laporan" (LaporanPage.tsx, bisa diakses semua role). BEDA dari "Buat
 * Laporan Jumat" (LaporanJumatModal.tsx, yang isinya laporan keuangan
 * lengkap): ini cuma kabar singkat siapa yang bertugas Jumat --
 * Khotib/Imam/Muadzin, jam Dzuhur -- format siap-tempel ke WA, biar bisa
 * dibagikan lebih awal di minggu itu (nggak perlu nunggu laporan keuangan
 * periode berjalan selesai). Data Imam/Muadzin tetap diisi/diubah lewat
 * Dashboard > Pengaturan Konten > Jadwal Khatib Jumat (Settings.tsx). Lihat
 * src/lib/laporanJumat.ts (buildPetugasJumatText) untuk detail formatnya.
 */
export default function PetugasJumatModal({ khatib, onClose }: Props) {
  const [hijri, setHijri] = useState<string | null>(null);
  const [waktuJumat, setWaktuJumat] = useState<string | null>(null);
  const [loadingAux, setLoadingAux] = useState(true);
  const [text, setText] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoadingAux(true);
    setCopied(false);
    const [y, m, d] = khatib.tanggal.split("-").map(Number);
    const tanggalDate = new Date(y, m - 1, d);

    Promise.allSettled([
      supabase.from("prayer_schedule_override").select("*").eq("date", khatib.tanggal).maybeSingle(),
      fetchHijriDateID(tanggalDate),
      fetchPrayerTimes(tanggalDate),
    ]).then(([overrideRes, hijriRes, timesRes]) => {
      if (!alive) return;
      const overrideRow = overrideRes.status === "fulfilled" ? (overrideRes.value.data as PrayerOverride | null) : null;
      const hijriVal = hijriRes.status === "fulfilled" ? hijriRes.value : null;
      const dzuhur = timesRes.status === "fulfilled" ? timesRes.value.dzuhur : null;

      setHijri(hijriVal);
      const waktu = overrideRow?.jumat || dzuhur || null;
      setWaktuJumat(waktu);

      setText(
        buildPetugasJumatText({
          tanggalJumat: khatib.tanggal,
          hijri: hijriVal,
          waktuJumat: waktu,
          namaKhotib: khatib.nama_ustadz,
          namaImam: khatib.imam,
          namaMuadzin: khatib.muadzin,
        })
      );
      setLoadingAux(false);
    });

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [khatib]);

  const buatUlang = () => {
    setText(
      buildPetugasJumatText({
        tanggalJumat: khatib.tanggal,
        hijri,
        waktuJumat,
        namaKhotib: khatib.nama_ustadz,
        namaImam: khatib.imam,
        namaMuadzin: khatib.muadzin,
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
      <div className="card max-w-lg w-full max-h-[90vh] flex flex-col">
        <div className="flex items-start justify-between gap-3 mb-1">
          <h3 className="font-serif font-bold text-lg text-primary-900">Bagikan Petugas Jumat</h3>
          <button className="text-gray-400 hover:text-gray-600 text-xl leading-none" onClick={onClose}>
            &times;
          </button>
        </div>
        <p className="text-xs text-gray-500 mb-3">
          Teks singkat siap-tempel ke WA -- petugas Sholat Jumat{" "}
          <span className="font-medium text-gray-700">{formatTanggalPanjang(khatib.tanggal)}</span>. Bisa dibagikan
          kapan saja, tidak perlu menunggu Laporan Keuangan periode ini selesai. Bisa diedit bebas sebelum disalin.
        </p>

        {!loadingAux && (!khatib.imam || !khatib.muadzin) && (
          <p className="text-xs text-yellow-600 mb-2">
            Nama Imam/Muadzin untuk jadwal ini belum lengkap -- akan tampil "-" pada teks, lengkapi dulu lewat tombol
            "Isi/Ubah Imam &amp; Muadzin" kalau perlu.
          </p>
        )}

        <div className="flex justify-end mb-2">
          <button className="btn-secondary text-sm" disabled={loadingAux} onClick={buatUlang}>
            🔄 Buat Ulang dari Data
          </button>
        </div>

        <textarea
          className="input flex-1 min-h-[280px] font-mono text-xs leading-relaxed resize-none"
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
