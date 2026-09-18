import { useEffect, useMemo, useState } from "react";
import { buildLaporanKeuangan, listPeriodeOptions } from "../../lib/laporanKeuangan";
import { FinancialTransaction } from "../../types";
import LaporanJumatModal from "./LaporanJumatModal";

function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

interface Props {
  /** Data dari tabel_bank (transaksi BRI + BSI). */
  items: FinancialTransaction[];
  /** Data dari tabel_infaq_buka_puasa, untuk baris info "Infaq Buka Puasa" di
   * bagian bawah laporan. Default ikut `items` kalau tidak diisi. */
  bukaPuasaItems?: FinancialTransaction[];
  /** false = tampilan ringkas untuk halaman publik: tanpa pilih periode
   * (otomatis pakai periode terbaru YANG SUDAH DIPUBLIKASIKAN, kalau belum
   * ada baliknya periode sebelumnya -- lihat komentar `periodeOtomatisPublik`
   * di bawah) dan tanpa tombol Unduh PDF/Publikasikan. Default true (dipakai
   * di Dashboard > Keuangan > tab Laporan). */
  showControls?: boolean;
  /** Kumpulan nama periode yang sudah dipublikasikan bendahara ke halaman
   * publik (lihat migration_022_laporan_publikasi.sql). Dipakai baik di
   * halaman publik (utk menentukan periode mana yg otomatis ditampilkan)
   * maupun di dashboard (utk menandai status tombol Publikasikan). */
  publishedPeriodes?: Set<string>;
  /** Diisi HANYA oleh dashboard (dan hanya utk bendahara) -- menampilkan
   * tombol Publikasikan/Batalkan Publikasi untuk periode yang sedang dilihat.
   * Kosongkan (undefined) supaya tombol tidak muncul (halaman publik / admin
   * read-only). */
  onTogglePublish?: (periode: string, publish: boolean) => void;
  /** true selagi permintaan publikasikan/batalkan sedang diproses -- dipakai
   * menonaktifkan tombol supaya tidak diklik dobel. */
  publishing?: boolean;
  /** true = tampilan super ringkas khusus Layar TV (src/pages/LayarTv.tsx):
   * cuma Kriteria + Jumlah (tanpa nomor urut & kolom Keterangan), tanpa kop
   * logo, font lebih besar supaya gampang dibaca dari jauh. Default false
   * (tampilan lengkap seperti biasa). Tidak berlaku kalau `showControls`
   * true (dashboard selalu tampilan lengkap). */
  compact?: boolean;
}

export default function LaporanKeuanganTab({
  items,
  bukaPuasaItems,
  showControls = true,
  publishedPeriodes,
  onTogglePublish,
  publishing = false,
  compact = false,
}: Props) {
  const periodeOptions = useMemo(() => listPeriodeOptions(items), [items]);

  // Periode yang otomatis ditampilkan di halaman PUBLIK: periode TERBARU
  // kalau sudah dipublikasikan bendahara, kalau belum maka periode
  // SEBELUMNYA (yang datanya sudah pasti final, tidak berubah lagi).
  const periodeOtomatisPublik = useMemo(() => {
    if (periodeOptions.length === 0) return "";
    const [terbaru, sebelumnya] = periodeOptions;
    if (terbaru && publishedPeriodes?.has(terbaru)) return terbaru;
    return sebelumnya ?? "";
  }, [periodeOptions, publishedPeriodes]);

  // Periode pilihan manual, khusus dashboard (showControls=true) -- null
  // berarti "belum diubah manual", jadi otomatis ikut periode terbaru begitu
  // data termuat (periodeOptions awalnya kosong sebelum load() selesai).
  // Begitu bendahara memilih lewat dropdown, nilainya jadi tetap dipakai.
  const [periodeManualOverride, setPeriodeManualOverride] = useState<string | null>(null);
  const periodeManual = periodeManualOverride ?? periodeOptions[0] ?? "";

  const periode = showControls ? periodeManual : periodeOtomatisPublik;
  const isPeriodePublished = periode ? (publishedPeriodes?.has(periode) ?? false) : false;

  const laporan = useMemo(() => {
    if (!periode) return null;
    return buildLaporanKeuangan(items, periode, bukaPuasaItems);
  }, [items, bukaPuasaItems, periode]);

  useEffect(() => {
    const cleanup = () => document.body.classList.remove("printing");
    window.addEventListener("afterprint", cleanup);
    return () => window.removeEventListener("afterprint", cleanup);
  }, []);

  const handleDownloadPdf = () => {
    document.body.classList.add("printing");
    window.print();
  };

  const [showLaporanJumat, setShowLaporanJumat] = useState(false);

  if (periodeOptions.length === 0) {
    return <p className="text-sm text-gray-400">Belum ada data transaksi untuk dibuatkan laporan.</p>;
  }

  // Halaman publik & belum ada apa-apa yang bisa ditampilkan (periode
  // terbaru belum dipublikasikan bendahara, dan belum ada periode sebelumnya
  // sama sekali -- mis. situs baru dipasang, baru "Pekan 1" yang ada datanya).
  if (!showControls && !periode) {
    return (
      <p className="text-sm text-gray-400 text-center">
        Laporan periode berjalan belum dipublikasikan pengurus. Silakan cek kembali nanti.
      </p>
    );
  }

  if (compact && !showControls) {
    return (
      <div className="max-w-2xl mx-auto">
        {laporan && (
          <>
            <h2 className="font-serif font-bold text-3xl text-primary-900 mb-6">Laporan Keuangan</h2>

            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              <div>
                <p className="text-sm text-gray-400">Periode</p>
                <p className="font-serif font-bold text-2xl text-primary-900">
                  {laporan.periode} &middot; {laporan.tahun}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-400">Saldo Akhir</p>
                <p className="font-bold text-3xl text-primary-800">{formatRupiah(laporan.saldoAkhir)}</p>
              </div>
            </div>

            <div className="flex flex-col gap-6">
              <div className="rounded-2xl bg-primary-50 border border-primary-100 p-5">
                <p className="font-semibold text-primary-800 text-lg mb-3">Penerimaan</p>
                <div className="space-y-2">
                  {laporan.penerimaan.map((row) => (
                    <div key={row.kriteria} className="flex items-center justify-between gap-2 text-base">
                      <span className="text-gray-700">{row.kriteria}</span>
                      <span className="font-semibold text-primary-700 shrink-0">
                        {row.jumlah > 0 ? formatRupiah(row.jumlah) : "-"}
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between gap-2 text-lg font-bold text-primary-900 border-t border-primary-200 pt-2 mt-2">
                    <span>Total</span>
                    <span>{formatRupiah(laporan.totalPenerimaan)}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-red-50 border border-red-100 p-5">
                <p className="font-semibold text-red-800 text-lg mb-3">Pengeluaran</p>
                <div className="space-y-2">
                  {laporan.pengeluaran.map((row) => (
                    <div key={row.kriteria} className="flex items-center justify-between gap-2 text-base">
                      <span className="text-gray-700">{row.kriteria}</span>
                      <span className="font-semibold text-red-600 shrink-0">
                        {row.jumlah > 0 ? formatRupiah(row.jumlah) : "-"}
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between gap-2 text-lg font-bold text-red-900 border-t border-red-200 pt-2 mt-2">
                    <span>Total</span>
                    <span>{formatRupiah(laporan.totalPengeluaran)}</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {showControls && (
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500">Pilih Periode:</label>
            <select
              className="input max-w-[200px]"
              value={periode}
              onChange={(e) => setPeriodeManualOverride(e.target.value)}
            >
              {periodeOptions.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            {onTogglePublish &&
              (isPeriodePublished ? (
                <span className="badge bg-primary-100 text-primary-700 border border-primary-200">
                  ✅ Tampil di publik
                </span>
              ) : (
                <span className="badge bg-yellow-100 text-yellow-700 border border-yellow-200">
                  Belum dipublikasikan
                </span>
              ))}
          </div>
          <div className="flex items-center gap-2">
            {onTogglePublish && laporan && (
              <button
                className={isPeriodePublished ? "btn-secondary text-sm" : "btn-primary text-sm"}
                disabled={publishing}
                onClick={() => onTogglePublish(periode, !isPeriodePublished)}
                title={
                  isPeriodePublished
                    ? "Sembunyikan lagi laporan periode ini dari halaman publik"
                    : "Tampilkan laporan periode ini di halaman publik (menu Keuangan)"
                }
              >
                {publishing
                  ? "Memproses..."
                  : isPeriodePublished
                  ? "Batalkan Publikasi"
                  : "📢 Publikasikan ke Publik"}
              </button>
            )}
            {laporan && (
              <button className="btn-secondary text-sm" onClick={handleDownloadPdf}>
                🖨️ Unduh PDF
              </button>
            )}
            {laporan && (
              <button className="btn-secondary text-sm" onClick={() => setShowLaporanJumat(true)}>
                📋 Buat Laporan Jumat
              </button>
            )}
          </div>
        </div>
      )}

      {showLaporanJumat && laporan && (
        <LaporanJumatModal laporan={laporan} onClose={() => setShowLaporanJumat(false)} />
      )}

      {laporan && (
        <div className="print-area card !p-0 overflow-hidden border border-primary-100 shadow-sm">
          {/* Kop laporan -- logo di kiri (ikut tercetak di PDF karena ada di dalam .print-area) */}
          <div className="bg-primary-900 text-white py-5 px-6 flex items-center gap-4">
            <img
              src={`${import.meta.env.BASE_URL}logo-al-amanah.png`}
              className="h-14 w-auto shrink-0"
              alt="Logo Mushalla Al Amanah"
            />
            <div className="flex-1 text-center">
              <h2 className="font-serif text-xl font-bold">Laporan Keuangan Mushalla Al Amanah</h2>
              <p className="text-sm text-white/70">Gedung Keuangan Negara I Denpasar</p>
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="text-gray-500">
                Periode <span className="font-semibold text-gray-800">{laporan.periode}</span> Tahun{" "}
                <span className="font-semibold text-gray-800">{laporan.tahun}</span>
              </span>
              {!laporan.adaData && (
                <span className="badge bg-yellow-100 text-yellow-700">Tidak ada transaksi pada periode ini</span>
              )}
            </div>

            {/* Saldo awal & akhir berdampingan */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="rounded-xl bg-gold-500/10 border border-gold-400/60 px-5 py-4">
                <p className="text-xs uppercase tracking-wide text-gold-600 font-medium mb-1">Saldo Awal</p>
                <p className="text-xl font-bold text-gold-600">{formatRupiah(laporan.saldoAwal)}</p>
              </div>
              <div className="rounded-xl bg-primary-800 text-white px-5 py-4">
                <p className="text-xs uppercase tracking-wide text-white/70 font-medium mb-1">Saldo Akhir</p>
                <p className="text-xl font-bold">{formatRupiah(laporan.saldoAkhir)}</p>
              </div>
            </div>

            {/* Penerimaan */}
            <div className="rounded-xl overflow-hidden border border-primary-200">
              <table className="w-full text-sm table-fixed">
                <colgroup>
                  <col className="w-8" />
                  <col className="w-40" />
                  <col className="w-36" />
                  <col />
                </colgroup>
                <thead>
                  <tr className="bg-primary-100 text-primary-900">
                    <th className="py-2 pl-4 pr-2 text-left"></th>
                    <th className="py-2 px-2 text-left">Kriteria</th>
                    <th className="py-2 px-2 text-right">Jumlah</th>
                    <th className="py-2 pl-2 pr-4 text-left">Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  {laporan.penerimaan.map((row, i) => (
                    <tr key={row.kriteria} className="border-t border-primary-100 align-top">
                      <td className="py-2 pl-4 pr-2 text-gray-400">{i + 1}.</td>
                      <td className="py-2 px-2 text-gray-800">{row.kriteria}</td>
                      <td className="py-2 px-2 text-right font-medium text-primary-700">
                        {row.jumlah > 0 ? formatRupiah(row.jumlah) : "-"}
                      </td>
                      <td className="py-2 pl-2 pr-4 text-gray-500 break-words">{row.keterangan}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-primary-200 bg-primary-50 font-semibold text-primary-900">
                    <td className="py-2 pl-4 pr-2" colSpan={2}>
                      Total Penerimaan
                    </td>
                    <td className="py-2 px-2 text-right">{formatRupiah(laporan.totalPenerimaan)}</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Pengeluaran */}
            <div className="rounded-xl overflow-hidden border border-red-200">
              <table className="w-full text-sm table-fixed">
                <colgroup>
                  <col className="w-8" />
                  <col className="w-40" />
                  <col className="w-36" />
                  <col />
                </colgroup>
                <thead>
                  <tr className="bg-red-100 text-red-900">
                    <th className="py-2 pl-4 pr-2 text-left"></th>
                    <th className="py-2 px-2 text-left">Kriteria</th>
                    <th className="py-2 px-2 text-right">Jumlah</th>
                    <th className="py-2 pl-2 pr-4 text-left">Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  {laporan.pengeluaran.map((row, i) => (
                    <tr key={row.kriteria} className="border-t border-red-100 align-top">
                      <td className="py-2 pl-4 pr-2 text-gray-400">{i + 1}.</td>
                      <td className="py-2 px-2 text-gray-800">{row.kriteria}</td>
                      <td className="py-2 px-2 text-right font-medium text-red-600">
                        {row.jumlah > 0 ? formatRupiah(row.jumlah) : "-"}
                      </td>
                      <td className="py-2 pl-2 pr-4 text-gray-500 break-words">{row.keterangan}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-red-200 bg-red-50 font-semibold text-red-900">
                    <td className="py-2 pl-4 pr-2" colSpan={2}>
                      Total Pengeluaran
                    </td>
                    <td className="py-2 px-2 text-right">{formatRupiah(laporan.totalPengeluaran)}</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="pt-2 border-t border-gray-100 text-sm text-gray-600">
              <p className="font-medium text-gray-700 mb-1">Informasi tambahan:</p>
              <ol className="list-decimal list-inside space-y-0.5">
                <li>Infaq Buka Puasa: {formatRupiah(laporan.totalBukaPuasa)}</li>
              </ol>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
