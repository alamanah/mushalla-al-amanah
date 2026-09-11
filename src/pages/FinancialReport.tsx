import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { computeRunningSaldo, computeRunningSaldoByJenis } from "../lib/saldo";
import { FINANCIAL_JENIS, FinancialJenis, FinancialTransaction } from "../types";

function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

function formatTanggal(t: string | null) {
  if (!t) return "-";
  return new Date(t).toLocaleString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type ActiveTab = FinancialJenis | "Rekapitulasi";
const TABS: ActiveTab[] = [...FINANCIAL_JENIS, "Rekapitulasi"];

export default function FinancialReport() {
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>("BRI");
  const [month, setMonth] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM

  useEffect(() => {
    supabase
      .from("financial_transactions")
      .select("*")
      .then(({ data }) => {
        setTransactions((data as FinancialTransaction[]) ?? []);
        setLoading(false);
      });
  }, []);

  const byJenis = useMemo(() => computeRunningSaldoByJenis(transactions), [transactions]);
  const combinedRows = useMemo(() => computeRunningSaldo(transactions), [transactions]);
  const isRekap = activeTab === "Rekapitulasi";
  const rowsAll = isRekap ? combinedRows : byJenis[activeTab] ?? [];
  const saldoTerkini = rowsAll.length > 0 ? rowsAll[rowsAll.length - 1].saldo : 0;

  const rowsBulanIni = useMemo(
    () => rowsAll.filter((t) => t.tanggal && t.tanggal.startsWith(month)),
    [rowsAll, month]
  );
  const totals = useMemo(() => {
    const debet = rowsBulanIni.reduce((a, b) => a + Number(b.debet), 0);
    const kredit = rowsBulanIni.reduce((a, b) => a + Number(b.kredit), 0);
    return { debet, kredit, selisih: debet - kredit };
  }, [rowsBulanIni]);

  const saldoGabungan = FINANCIAL_JENIS.reduce((sum, j) => {
    const rows = byJenis[j] ?? [];
    return sum + (rows.length > 0 ? rows[rows.length - 1].saldo : 0);
  }, 0);

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <h1 className="font-serif text-3xl font-bold text-primary-900 mb-2">Laporan Keuangan</h1>
      <p className="text-sm text-gray-500 mb-6">
        Laporan transparan kas Mushalla Al Amanah, dikelola oleh bendahara.
      </p>

      <div className="card mb-6 flex items-center justify-between">
        <span className="text-sm text-gray-500">Total Saldo Kas (semua rekening)</span>
        <span className="text-2xl font-bold text-gold-600">{formatRupiah(saldoGabungan)}</span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex gap-2">
          {TABS.map((j) => (
            <button
              key={j}
              onClick={() => setActiveTab(j)}
              className={`badge border ${
                activeTab === j
                  ? "bg-primary-700 text-white border-primary-700"
                  : "bg-white text-gray-500 border-gray-200"
              }`}
            >
              {j}
            </button>
          ))}
        </div>
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="input max-w-[180px]" />
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <div className="card">
          <p className="text-xs text-gray-500">Pemasukan Bulan Ini ({activeTab})</p>
          <p className="text-xl font-bold text-primary-700">{formatRupiah(totals.debet)}</p>
        </div>
        <div className="card">
          <p className="text-xs text-gray-500">Pengeluaran Bulan Ini ({activeTab})</p>
          <p className="text-xl font-bold text-red-600">{formatRupiah(totals.kredit)}</p>
        </div>
        <div className="card">
          <p className="text-xs text-gray-500">{isRekap ? "Saldo Gabungan Saat Ini" : `Saldo ${activeTab} Saat Ini`}</p>
          <p className="text-xl font-bold text-gold-600">{formatRupiah(saldoTerkini)}</p>
        </div>
      </div>

      <div className="card overflow-x-auto">
        {loading && <p className="text-sm text-gray-400">Memuat data...</p>}
        {!loading && rowsBulanIni.length === 0 && (
          <p className="text-sm text-gray-400">Tidak ada transaksi {activeTab} pada bulan ini.</p>
        )}
        {rowsBulanIni.length > 0 && (
          <table className="w-full text-sm table-fixed">
            <colgroup>
              <col className="w-28" />
              {isRekap && <col className="w-16" />}
              <col className="w-28" />
              <col />
              <col className="w-28" />
              <col className="w-28" />
              <col className="w-28" />
            </colgroup>
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="py-2 pr-4">Tanggal</th>
                {isRekap && <th className="py-2 pr-4">Jenis</th>}
                <th className="py-2 pr-4">Kriteria</th>
                <th className="py-2 pr-4">Keterangan</th>
                <th className="py-2 pr-4 text-right">Pemasukan</th>
                <th className="py-2 pr-4 text-right">Pengeluaran</th>
                <th className="py-2 pr-4 text-right">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {rowsBulanIni.map((t) => (
                <tr key={t.id} className="border-b last:border-0">
                  <td className="py-2 pr-4 whitespace-nowrap">{formatTanggal(t.tanggal)}</td>
                  {isRekap && (
                    <td className="py-2 pr-4 whitespace-nowrap">
                      <span className="badge bg-primary-50 text-primary-700">{t.jenis}</span>
                    </td>
                  )}
                  <td className="py-2 pr-4 truncate">{t.kriteria}</td>
                  <td className="py-2 pr-4 text-gray-500 truncate" title={t.keterangan ?? undefined}>
                    {t.keterangan}
                  </td>
                  <td className="py-2 pr-4 text-right text-primary-700 truncate">
                    {t.debet > 0 ? formatRupiah(t.debet) : ""}
                  </td>
                  <td className="py-2 pr-4 text-right text-red-600 truncate">
                    {t.kredit > 0 ? formatRupiah(t.kredit) : ""}
                  </td>
                  <td className="py-2 pr-4 text-right font-medium truncate">{formatRupiah(t.saldo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="text-xs text-gray-400 mt-3">
        Saldo dihitung berjalan (kumulatif) sejak Saldo Awal masing-masing rekening.
      </p>
    </div>
  );
}
