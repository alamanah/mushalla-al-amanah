import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { FinancialTransaction } from "../types";
import { TABEL_BANK, TABEL_INFAQ_BUKA_PUASA } from "../lib/tabelKeuangan";
import LaporanKeuanganTab from "./dashboard/LaporanKeuanganTab";

export default function FinancialReport() {
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [bukaPuasa, setBukaPuasa] = useState<FinancialTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([supabase.from(TABEL_BANK).select("*"), supabase.from(TABEL_INFAQ_BUKA_PUASA).select("*")]).then(
      ([bank, buka]) => {
        setTransactions((bank.data as FinancialTransaction[]) ?? []);
        setBukaPuasa((buka.data as FinancialTransaction[]) ?? []);
        setLoading(false);
      }
    );
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <h1 className="font-serif text-3xl font-bold text-primary-900 mb-8 text-center">Laporan Keuangan</h1>

      {loading && <p className="text-sm text-gray-400 text-center">Memuat data...</p>}
      {!loading && <LaporanKeuanganTab items={transactions} bukaPuasaItems={bukaPuasa} showControls={false} />}
    </div>
  );
}
