import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { FinancialTransaction } from "../types";

function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

export default function FinancialReport() {
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM

  useEffect(() => {
    supabase
      .from("financial_transactions")
      .select("*")
      .order("tanggal", { ascending: false })
      .then(({ data }) => {
        setTransactions((data as FinancialTransaction[]) ?? []);
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(
    () => transactions.filter((t) => t.tanggal.startsWith(month)),
    [transactions, month]
  );

  const totals = useMemo(() => {
    const masuk = filtered.filter((t) => t.jenis === "masuk").reduce((a, b) => a + Number(b.jumlah), 0);
    const keluar = filtered.filter((t) => t.jenis === "keluar").reduce((a, b) => a + Number(b.jumlah), 0);
    return { masuk, keluar, saldo: masuk - keluar };
  }, [filtered]);

  const saldoBerjalan = useMemo(
    () => transactions.reduce((a, b) => a + (b.jenis === "masuk" ? Number(b.jumlah) : -Number(b.jumlah)), 0),
    [transactions]
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="font-serif text-3xl font-bold text-primary-900">Laporan Keuangan</h1>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="input max-w-[180px]"
        />
      </div>

      <div className="grid sm:grid-cols-4 gap-4 mb-6">
        <div className="card">
          <p className="text-xs text-gray-500">Pemasukan Bulan Ini</p>
          <p className="text-xl font-bold text-primary-700">{formatRupiah(totals.masuk)}</p>
        </div>
        <div className="card">
          <p className="text-xs text-gray-500">Pengeluaran Bulan Ini</p>
          <p className="text-xl font-bold text-red-600">{formatRupiah(totals.keluar)}</p>
        </div>
        <div className="card">
          <p className="text-xs text-gray-500">Selisih Bulan Ini</p>
          <p className={`text-xl font-bold ${totals.saldo >= 0 ? "text-primary-700" : "text-red-600"}`}>
            {formatRupiah(totals.saldo)}
          </p>
        </div>
        <div className="card">
          <p className="text-xs text-gray-500">Saldo Kas Saat Ini</p>
          <p className="text-xl font-bold text-gold-600">{formatRupiah(saldoBerjalan)}</p>
        </div>
      </div>

      <div className="card overflow-x-auto">
        {loading && <p className="text-sm text-gray-400">Memuat data...</p>}
        {!loading && filtered.length === 0 && (
          <p className="text-sm text-gray-400">Tidak ada transaksi pada bulan ini.</p>
        )}
        {filtered.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="py-2 pr-4">Tanggal</th>
                <th className="py-2 pr-4">Kategori</th>
                <th className="py-2 pr-4">Keterangan</th>
                <th className="py-2 pr-4 text-right">Pemasukan</th>
                <th className="py-2 pr-4 text-right">Pengeluaran</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id} className="border-b last:border-0">
                  <td className="py-2 pr-4 whitespace-nowrap">{t.tanggal}</td>
                  <td className="py-2 pr-4">{t.kategori}</td>
                  <td className="py-2 pr-4 text-gray-500">{t.deskripsi}</td>
                  <td className="py-2 pr-4 text-right text-primary-700">
                    {t.jenis === "masuk" ? formatRupiah(t.jumlah) : ""}
                  </td>
                  <td className="py-2 pr-4 text-right text-red-600">
                    {t.jenis === "keluar" ? formatRupiah(t.jumlah) : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="text-xs text-gray-400 mt-3">
        Laporan keuangan ini dikelola oleh Bendahara Mushalla Al Amanah dan bersifat terbuka untuk jamaah.
      </p>
    </div>
  );
}
