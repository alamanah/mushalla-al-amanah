import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { fetchHijriDateID, fetchPrayerTimes } from "../../lib/prayerTimes";
import {
  buildLaporanJumatText,
  formatAngka,
  formatTanggalJumatPanjang,
  labelPeriodeJumat,
  LaporanJumatData,
  perTanggalLaporan,
  tanggalJumatDefault,
} from "../../lib/laporanJumat";
import { LaporanKeuanganResult } from "../../lib/laporanKeuangan";
import { KhatibJumatSchedule, PrayerOverride } from "../../types";

interface Props {
  laporan: LaporanKeuanganResult;
  onClose: () => void;
}

/**
 * Modal "Buat Laporan Jumat" -- tombolnya ada di Dashboard > menu "Laporan"
 * (LaporanPage.tsx, bisa diakses semua role). Menyusun teks pengumuman
 * mingguan siap-tempel ke WhatsApp (buildLaporanJumatText) yang
 * menggabungkan Laporan Keuangan periode yang sedang dilihat + petugas
 * Sholat Jumat (Khotib/Imam/Muadzin, dari Dashboard > Pengaturan Konten >
 * Jadwal Khatib Jumat) + jadwal waktu sholat Jumat. Teksnya tetap bisa
 * diedit bebas sebelum disalin (mode "Teks"); mode "Preview" menampilkan
 * versi rapi 1-halaman (rincian keuangan sebagai tabel) -- versi yang sama
 * persis yang dicetak/diunduh sebagai PDF, lihat <LaporanJumatPreview>.
 */
export default function LaporanJumatModal({ laporan, onClose }: Props) {
  const [tanggalJumat, setTanggalJumat] = useState(tanggalJumatDefault());
  const [khatib, setKhatib] = useState<KhatibJumatSchedule | null>(null);
  const [hijri, setHijri] = useState<string | null>(null);
  const [waktuJumat, setWaktuJumat] = useState<string | null>(null);
  const [loadingAux, setLoadingAux] = useState(true);
  const [text, setText] = useState("");
  const [copied, setCopied] = useState(false);
  const [mode, setMode] = useState<"teks" | "preview">("teks");

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

  const previewData: LaporanJumatData = {
    laporan,
    tanggalJumat,
    hijri,
    waktuJumat,
    namaKhotib: khatib?.nama_ustadz ?? null,
    namaImam: khatib?.imam ?? null,
    namaMuadzin: khatib?.muadzin ?? null,
  };

  const buatUlang = () => {
    setText(buildLaporanJumatText(previewData));
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
          Pengumuman mingguan -- Laporan Keuangan periode{" "}
          <span className="font-medium text-gray-700">{laporan.periode}</span> yang sedang dilihat, digabung dengan
          petugas Sholat Jumat & jadwal waktunya.
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
          <div className="ml-auto flex items-center gap-2">
            <div className="inline-flex rounded-lg border border-gray-200 p-0.5 text-xs">
              <button
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  mode === "teks" ? "bg-primary-700 text-white" : "text-gray-500"
                }`}
                onClick={() => setMode("teks")}
              >
                ✏️ Teks
              </button>
              <button
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  mode === "preview" ? "bg-primary-700 text-white" : "text-gray-500"
                }`}
                onClick={() => setMode("preview")}
              >
                👁️ Preview
              </button>
            </div>
            {mode === "teks" && (
              <button className="btn-secondary text-sm" disabled={loadingAux} onClick={buatUlang}>
                🔄 Buat Ulang
              </button>
            )}
          </div>
        </div>

        {mode === "teks" ? (
          <textarea
            className="input flex-1 min-h-[320px] font-mono text-xs leading-relaxed resize-none"
            value={loadingAux ? "Memuat data..." : text}
            onChange={(e) => setText(e.target.value)}
            disabled={loadingAux}
          />
        ) : (
          <div className="flex-1 min-h-[320px] overflow-y-auto border border-gray-200 rounded-lg p-4">
            {loadingAux ? (
              <p className="text-sm text-gray-400">Memuat data...</p>
            ) : (
              <LaporanJumatPreview {...previewData} />
            )}
          </div>
        )}

        <div className="flex gap-2 mt-3">
          <button className="btn-primary flex-1" disabled={loadingAux} onClick={salinTeks}>
            {copied ? "✅ Tersalin!" : "📋 Salin untuk WhatsApp"}
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
        terpotong sebatas tinggi layar. Dibuat dari data terstruktur
        (bukan parsing teks di atas) supaya rincian keuangannya bisa jadi
        tabel yang rapi & ringkas -- lihat <LaporanJumatPreview>. */}
    {!loadingAux && (
      <div className="hidden print:block print-area bg-white p-6">
        <LaporanJumatPreview {...previewData} />
      </div>
    )}
    </>
  );
}

/**
 * Versi "cantik" Laporan Jumat -- dipakai DUA kali: (1) mode "Preview" di
 * modal (dilihat langsung di layar), dan (2) area cetak/PDF (persis sama,
 * lihat komentar di atas) -- supaya WYSIWYG, apa yang dilihat di Preview
 * ITULAH yang jadi PDF-nya. Dibuat dari data terstruktur (LaporanJumatData)
 * langsung, bukan dari teks WhatsApp (yang bisa diedit bebas oleh
 * penggunanya) -- rincian keuangan dirender sebagai tabel supaya ringkas &
 * gampang dibaca (permintaan: muat dalam 1 halaman PDF). Ukuran teks & jarak
 * antar-baris sengaja dibuat kecil/rapat (banyak dipakai `text-[11px]`,
 * `mb-1`/`mb-2`) demi tujuan itu.
 */
function LaporanJumatPreview({
  laporan,
  tanggalJumat,
  hijri,
  waktuJumat,
  namaKhotib,
  namaImam,
  namaMuadzin,
}: LaporanJumatData) {
  const periodeLabel = labelPeriodeJumat(laporan.periode);
  const perTanggal = perTanggalLaporan(laporan, tanggalJumat);
  const tanggalPanjang = formatTanggalJumatPanjang(tanggalJumat);
  const waktu = (waktuJumat ?? "12:00").replace(":", ".");

  const moneyRows: { label: string; jumlah: number; sub?: boolean }[] = [
    { label: "Saldo Awal", jumlah: laporan.saldoAwal },
    { label: "Penerimaan", jumlah: laporan.totalPenerimaan },
    ...laporan.penerimaan.filter((r) => r.jumlah > 0).map((r) => ({ label: r.kriteria, jumlah: r.jumlah, sub: true })),
    { label: "Pengeluaran", jumlah: laporan.totalPengeluaran },
    ...laporan.pengeluaran.filter((r) => r.jumlah > 0).map((r) => ({ label: r.kriteria, jumlah: r.jumlah, sub: true })),
    { label: "Saldo Akhir", jumlah: laporan.saldoAkhir },
  ];

  return (
    <div className="bg-white text-[11px] leading-snug text-gray-800">
      <div className="flex items-center gap-3 border-b border-gray-200 pb-2 mb-2.5">
        <img
          src={`${import.meta.env.BASE_URL}logo-al-amanah.png`}
          className="h-10 w-auto shrink-0"
          alt="Logo Mushalla Al Amanah"
        />
        <div>
          <h2 className="font-serif text-base font-bold text-primary-900 leading-tight">Laporan Jumat</h2>
          <p className="text-[10px] text-gray-500">
            Mushalla Al Amanah GKN I Denpasar &middot; {formatTanggalCetak(tanggalJumat)}
          </p>
        </div>
      </div>

      <div dir="rtl" className="text-right mb-2.5 text-[13px]">
        <p>بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</p>
        <p>السَّلَامُ عَلَيْكُمْ وَرَحْمَةُ اللَّهِ وَبَرَكَاتُهُ</p>
        <p className="mt-1">الْحَمْدُ لِلَّهِ وَالصَّلَاةُ وَالسَّلَامُ عَلَى رَسُولِ اللَّهِ وَعَلَى آلِهِ وَأَصْحَابِهِ وَمَنْ وَالَاهُ</p>
      </div>

      <p className="mb-2">Mohon perhatian Jama'ah rahimakumullah atas informasi yang akan kami sampaikan :</p>

      <p className="mb-2">
        <b>1.</b> Yang pertama, kami mohon kesediaan jama'ah untuk menggeser kotak infaq ke sebelah kiri/selatan, dan
        infaq juga bisa disampaikan melalui QRIS yang ada di pintu-pintu masuk Mushola.
      </p>

      <p className="mb-1">
        <b>2.</b> Yg ke-2, dapat kami sampaikan Laporan Keuangan Mushalla Al Amanah GKN I Denpasar Periode{" "}
        {periodeLabel} (Per {perTanggal})
      </p>
      <table className="w-full mb-2 border-collapse">
        <tbody>
          {moneyRows.map((r, i) => (
            <tr key={i} className={r.sub ? "text-gray-500" : "font-semibold text-gray-800"}>
              <td className="py-0.5 pr-2">
                {r.sub ? <span className="pl-4 font-normal inline-block">• {r.label}</span> : r.label}
              </td>
              <td className="py-0.5 text-right whitespace-nowrap">{formatAngka(r.jumlah)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mb-2">
        Kepada Jama'ah yg sudah berinfaq kami sampaikan Jazakumullahu khairan katsir, semoga Allah menggantinya
        dengan yang lebih baik. Aamiin.
      </p>

      <p className="mb-0.5">
        <b>3.</b> Yg ke-3, kami sampaikan Agenda Rutin Mushalla Al Amanah antara lain sbb:
      </p>
      <p className="mb-0.5 pl-3">a. Kajian Rutin: Setiap Rabu (Ba'da Dzuhur);</p>
      <p className="mb-0.5 pl-3">
        b. Kajian Tematik: Senin & Kamis (Ba'da Magrib) - Insya Allah semua kajian Live di Youtube Mushalla Al
        Amanah;
      </p>
      <p className="mb-2 pl-3">c. Buka Puasa Sunnah: Senin & Kamis.</p>

      <p className="mb-2">
        Mari jama'ah kita makmurkan mushalla kita ini. Semoga Allah memudahkan kita untuk meniti jalan menuju
        surga-Nya.
      </p>

      <p className="mb-0.5">
        <b>4.</b> Selanjutnya yang bertugas pada Sholat Jum'at hari ini, Jum'at{hijri ? `, ${hijri}` : ""} |{" "}
        {tanggalPanjang} adalah sbb :
      </p>
      <p className="mb-0.5 pl-3">○ Khotib : {namaKhotib || "-"}</p>
      <p className="mb-0.5 pl-3">○ Imam : {namaImam || "-"}</p>
      <p className="mb-2 pl-3">○ Muadzin : {namaMuadzin || "-"}</p>

      <p className="mb-0.5">
        <b>5.</b> Demi kesempurnaan dan tertibnya ibadah sholat Jum'at, kami mohon :
      </p>
      <p className="mb-0.5 pl-3">
        ○ Untuk segera memasuki Mushola dan mengisi shaf-shaf yang masih kosong, agar saudara-saudara kita yang
        belakangan hadir bisa mendapatkan tempat;
      </p>
      <p className="mb-0.5 pl-3">○ Mematikan HP selama pelaksanaan ibadah sholat Jum'at;</p>
      <p className="mb-0.5 pl-3">○ Mendengarkan khutbah dengan khusyu'; dan</p>
      <p className="mb-2 pl-3">
        ○ Ketika khotib sudah naik mimbar mohon tidak melakukan hal-hal yang membuat sholat Jum'at menjadi sia-sia,
        antara lain bercakap-cakap dan bermain HP.
      </p>

      <p className="mb-2">
        <b>6.</b> InSya Allah jadwal waktu sholat Jum'at hari ini pukul {waktu} WITA.
      </p>

      <p className="mb-1">Demikian, atas perhatiannya kami sampaikan, Jazakumullahu khairan katsir,</p>
      <p dir="rtl" className="text-right text-[13px]">
        وَالسَّلَامُ عَلَيْكُمْ وَرَحْمَةُ اللَّهِ وَبَرَكَاتُهُ
      </p>
    </div>
  );
}

function formatTanggalCetak(tanggal: string): string {
  const [y, m, d] = tanggal.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
