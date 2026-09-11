import { useMemo, useState } from "react";
import { buildLaporanKeuangan, listPeriodeOptions } from "../../lib/laporanKeuangan";
import { FinancialTransaction } from "../../types";

function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

function formatTanggalPanjang(t: string | null) {
  if (!t) return "-";
  return new Date(t).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

export default function LaporanKeuanganTab({ items }: { items: FinancialTransaction[] }) {
  const periodeOptions = useMemo(() => listPeriodeOptions(items), [items]);
  const [periode, setPeriode] = useState<string>(periodeOptions[0] ?? "");

  const laporan = useMemo(() => {
    if (!periode) return null;
    return buildLaporanKeuangan(items, periode);
  }, [items, periode]);

  if (periodeOptions.length === 0) {
    return <p className="text-sm text-gray-400">Belum ada data transaksi untuk dibuatkan laporan.</p>;
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-2 mb-4">
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
        <div className="card !p-0 overflow-hidden border border-primary-100 shadow-sm">
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

            {/* Saldo awal */}
            <div className="rounded-xl bg-gold-500/10 border border-gold-400/60 px-5 py-4 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-gold-600 font-medium">Saldo Awal</p>
                <p className="text-xs text-gray-500">BRI, BSI &amp; UP Tunai</p>
              </div>
              <p className="text-2xl font-bold text-gold-600">{formatRupiah(laporan.saldoAwal)}</p>
            </div>

            {/* Penerimaan */}
            <div className="rounded-xl overflow-hidden border border-primary-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-primary-100 text-primary-900">
                    <th className="py-2 pl-4 pr-2 text-left w-8">#</th>
                    <th className="py-2 px-2 text-left">Jumlah</th>
                    <th className="py-2 pl-2 pr-4 text-left">Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  {laporan.penerimaan.map((row, i) => (
                    <tr key={row.kriteria} className="border-t border-primary-100">
                      <td className="py-2 pl-4 pr-2 text-gray-400">{i + 1}.</td>
                      <td className="py-2 px-2">
                        <div className="text-gray-800">{row.kriteria}</div>
                        <div className="font-medium text-primary-700">
                          {row.jumlah > 0 ? formatRupiah(row.jumlah) : "-"}
                        </div>
                      </td>
                      <td className="py-2 pl-2 pr-4 text-gray-500">{row.keterangan}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-primary-200 bg-primary-50 font-semibold text-primary-900">
                    <td className="py-2 pl-4 pr-2" colSpan={2}>
                      Total Penerimaan
                    </td>
                    <td className="py-2 pl-2 pr-4">{formatRupiah(laporan.totalPenerimaan)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Pengeluaran */}
            <div className="rounded-xl overflow-hidden border border-red-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-red-100 text-red-900">
                    <th className="py-2 pl-4 pr-2 text-left w-8">#</th>
                    <th className="py-2 px-2 text-left">Jumlah</th>
                    <th className="py-2 pl-2 pr-4 text-left">Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  {laporan.pengeluaran.map((row, i) => (
                    <tr key={row.kriteria} className="border-t border-red-100">
                      <td className="py-2 pl-4 pr-2 text-gray-400">{i + 1}.</td>
                      <td className="py-2 px-2">
                        <div className="text-gray-800">{row.kriteria}</div>
                        <div className="font-medium text-red-600">{row.jumlah > 0 ? formatRupiah(row.jumlah) : "-"}</div>
                      </td>
                      <td className="py-2 pl-2 pr-4 text-gray-500">{row.keterangan}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-red-200 bg-red-50 font-semibold text-red-900">
                    <td className="py-2 pl-4 pr-2" colSpan={2}>
                      Total Pengeluaran
                    </td>
                    <td className="py-2 pl-2 pr-4">{formatRupiah(laporan.totalPengeluaran)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Saldo akhir */}
            <div className="rounded-xl bg-primary-800 text-white px-5 py-4 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-white/70 font-medium">Saldo Akhir</p>
                <p className="text-xs text-white/60">BRI, BSI &amp; UP Tunai</p>
              </div>
              <p className="text-2xl font-bold">{formatRupiah(laporan.saldoAkhir)}</p>
            </div>

            <p className="text-xs text-gray-400 italic text-center">
              *data per {formatTanggalPanjang(laporan.tanggalTerakhir)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
