import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { FinancialTransaction } from "../types";
import { TABEL_INFAQ_BUKA_PUASA, TABEL_UP_BANK, TABEL_UP_TUNAI } from "../lib/tabelKeuangan";
import LaporanKeuanganTab from "./dashboard/LaporanKeuanganTab";

export default function FinancialReport() {
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [bukaPuasa, setBukaPuasa] = useState<FinancialTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Laporan = kas operasional gabungan (tabel_up_bank + tabel_up_tunai),
    // bukan tabel_bank -- lihat FinancePage.tsx.
    Promise.all([
      supabase.from(TABEL_UP_BANK).select("*"),
      supabase.from(TABEL_UP_TUNAI).select("*"),
      supabase.from(TABEL_INFAQ_BUKA_PUASA).select("*"),
    ]).then(([upBank, upTunai, buka]) => {
      const upBankRows = (upBank.data as FinancialTransaction[]) ?? [];
      const upTunaiRows = (upTunai.data as FinancialTransaction[]) ?? [];
      setTransactions([...upBankRows, ...upTunaiRows]);
      setBukaPuasa((buka.data as FinancialTransaction[]) ?? []);
      setLoading(false);
    });
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <h1 className="font-serif text-3xl font-bold text-primary-900 mb-8 text-center">Laporan Keuangan</h1>

      {loading && <p className="text-sm text-gray-400 text-center">Memuat data...</p>}
      {!loading && <LaporanKeuanganTab items={transactions} bukaPuasaItems={bukaPuasa} showControls={false} />}
    </div>
  );
}
