import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { fetchHijriDateID, fetchPrayerTimes } from "../../lib/prayerTimes";
import { buildLaporanJumatText, isArabicLine, tanggalJumatDefault } from "../../lib/laporanJumat";
import { LaporanKeuanganResult } from "../../lib/laporanKeuangan";
import { KhatibJumatSchedule, PrayerOverride } from "../../types";

interface Props {
  laporan: LaporanKeuanganResult;
  onClose: () => void;
}

/**
 * Modal "Buat Laporan Jumat" -- tombolnya ada di Dashboard > menu "Laporan"
 * (LaporanPage.tsx, bisa diakses semua role, lewat prop `extraActions` di
 * LaporanKeuanganTab.tsx). Menyusun teks pengumuman mingguan siap-tempel
 * (mis. utk broadcast WhatsApp) yang menggabungkan Laporan Keuangan periode
 * yang sedang dilihat + petugas Sholat Jumat (Khotib/Imam/Muadzin, dari
 * Dashboard > Pengaturan Konten > Jadwal Khatib Jumat) + jadwal waktu sholat
 * Jumat -- lihat src/lib/laporanJumat.ts utk detail formatnya. Hasilnya
 * tetap bisa diedit bebas sebelum disalin.
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

  // Unduh PDF -- pakai mekanisme cetak bawaan situs (lihat .print-area &
  // "body.printing" di src/index.css, sama seperti tombol "Unduh PDF" di
  // Laporan Keuangan): elemen lain disembunyikan sementara, hanya area
  // bertanda .print-area (lihat di bawah) yang tampil, lalu pengguna
  // tinggal pilih "Simpan sebagai PDF" di kotak dialog cetak browser.
  // Dipilih ketimbang membuat PDF lewat library baru supaya salam/shalawat
  // huruf Arab tetap dirender browser apa adanya (rapi, tanpa perlu font
  // tambahan), dan teksnya tetap bisa diseleksi/dicari di PDF hasilnya.
  useEffect(() => {
    const cleanup = () => document.body.classList.remove("printing");
    window.addEventListener("afterprint", cleanup);
    return () => window.removeEventListener("afterprint", cleanup);
  }, []);

  const unduhPdf = () => {
    document.body.classList.add("printing");
    window.print();
  };

  return (
    <>
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
          <button className="btn-secondary" disabled={loadingAux} onClick={unduhPdf}>
            🖨️ Unduh PDF
          </button>
          <button className="btn-secondary" onClick={onClose}>
            Tutup
          </button>
        </div>
      </div>
    </div>

    {/* Versi cetak/PDF -- tersembunyi di layar biasa (className "hidden"),
        cuma muncul saat mencetak lewat .print-area (lihat unduhPdf() di
        atas & src/index.css). Diletakkan di LUAR wrapper modal (yang
        position-nya "fixed") supaya saat dicetak halamannya tidak
        terpotong sebatas tinggi layar -- lihat penjelasan di unduhPdf().
        Baris yang mengandung huruf Arab dirender rata-kanan (dir="rtl")
        supaya salam/shalawat tampil wajar, baris lain tetap rata-kiri. */}
    <div className="hidden print:block print-area bg-white p-8">
      <div className="flex items-center gap-4 border-b border-gray-200 pb-4 mb-6">
        <img src={`${import.meta.env.BASE_URL}logo-al-amanah.png`} className="h-14 w-auto shrink-0" alt="Logo Mushalla Al Amanah" />
        <div>
          <h2 className="font-serif text-xl font-bold text-primary-900">Laporan Jumat</h2>
          <p className="text-sm text-gray-500">
            Mushalla Al Amanah GKN I Denpasar &middot; {formatTanggalCetak(tanggalJumat)}
          </p>
        </div>
      </div>
      <div className="text-sm leading-relaxed text-gray-800">
        {text.split("\n").map((line, i) =>
          line.trim() === "" ? (
            <div key={i} className="h-3" />
          ) : (
            <p key={i} dir={isArabicLine(line) ? "rtl" : "ltr"} className={isArabicLine(line) ? "text-right" : "text-left"}>
              {line}
            </p>
          )
        )}
      </div>
    </div>
    </>
  );
}

function formatTanggalCetak(tanggal: string): string {
  const [y, m, d] = tanggal.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}
