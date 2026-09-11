import { useEffect, useMemo, useState } from "react";
import { buildLaporanKeuangan, listPeriodeOptions } from "../../lib/laporanKeuangan";
import { FinancialTransaction } from "../../types";

function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

interface Props {
  items: FinancialTransaction[];
  /** false = tampilan ringkas untuk halaman publik: tanpa pilih periode
   * (otomatis pakai periode terbaru) dan tanpa tombol Unduh PDF. Default
   * true (dipakai di Dashboard > Keuangan > tab Laporan). */
  showControls?: boolean;
}

export default function LaporanKeuanganTab({ items, showControls = true }: Props) {
  const periodeOptions = useMemo(() => listPeriodeOptions(items), [items]);
  const [periode, setPeriode] = useState<string>(periodeOptions[0] ?? "");

  const laporan = useMemo(() => {
    if (!periode) return null;
    return buildLaporanKeuangan(items, periode);
  }, [items, periode]);

  useEffect(() => {
    const cleanup = () => document.body.classList.remove("printing");
    window.addEventListener("afterprint", cleanup);
    return () => window.removeEventListener("afterprint", cleanup);
  }, []);

  const handleDownloadPdf = () => {
    document.body.classList.add("printing");
    window.print();
  };

  if (periodeOptions.length === 0) {
    return <p className="text-sm text-gray-400">Belum ada data transaksi untuk dibuatkan laporan.</p>;
  }

  return (
    <div className="max-w-3xl mx-auto">
      {showControls && (
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500">Pilih Periode:</label>
            <select className="input max-w-[200px]" value={periode} onChange={(e) => setPeriode(e.target.value)}>
              {periodeOptions.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          {laporan && (
            <button className="btn-secondary text-sm" onClick={handleDownloadPdf}>
              🖨️ Unduh PDF
            </button>
          )}
        </div>
      )}

      {laporan && (
        <div className="print-area card !p-0 overflow-hidden border border-primary-100 shadow-sm">
          {/* Kop laporan */}
          <div className="bg-primary-900 text-white text-center py-5 px-4">
            <h2 className="font-serif text-xl font-bold">Laporan Keuangan Mushalla Al Amanah</h2>
            <p className="text-sm text-white/70">Gedung Keuangan Negara I Denpasar</p>
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
