import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { TABEL_INFAQ_BUKA_PUASA, TABEL_UP_BANK, TABEL_UP_TUNAI } from "../../lib/tabelKeuangan";
import { bulanKeyDari, bulanKeySekarang, bulanOptionsDari, labelBulan } from "../../lib/bulanFilter";
import { fetchHijriMap } from "../../lib/prayerTimes";
import { LaporanKeuanganResult } from "../../lib/laporanKeuangan";
import { FinancialTransaction, KhatibJumatSchedule } from "../../types";
import LaporanKeuanganTab from "./LaporanKeuanganTab";
import LaporanJumatModal from "./LaporanJumatModal";
import PetugasJumatModal from "./PetugasJumatModal";

function formatTanggal(tgl: string) {
  const [y, m, d] = tgl.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("id-ID", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
}

/**
 * Menu "Laporan" di sidebar dashboard -- BEDA dari "Keuangan" (khusus
 * admin/bendahara, buat catat transaksi) dan "Pengaturan Konten" (khusus
 * admin/humas, buat atur jadwal Khatib Jumat): halaman ini cuma berisi
 * alat-alat LIHAT & BAGIKAN laporan/pengumuman, jadi dibuka untuk SEMUA role
 * pengurus (lihat App.tsx & DashboardLayout.tsx) -- siapa saja yang perlu
 * mengunduh PDF Laporan Keuangan, membuat teks Laporan Jumat, atau
 * membagikan info petugas Sholat Jumat ke WA, tidak perlu akses Keuangan
 * atau Pengaturan Konten dulu.
 */
export default function LaporanPage() {
  const [loading, setLoading] = useState(true);
  const [upBankRows, setUpBankRows] = useState<FinancialTransaction[]>([]);
  const [upTunaiRows, setUpTunaiRows] = useState<FinancialTransaction[]>([]);
  const [bukaPuasaRows, setBukaPuasaRows] = useState<FinancialTransaction[]>([]);
  const [khatibList, setKhatibList] = useState<KhatibJumatSchedule[]>([]);
  const [hijriMap, setHijriMap] = useState<Record<string, string | null>>({});
  const [bulan, setBulan] = useState(bulanKeySekarang());
  const [laporanJumat, setLaporanJumat] = useState<LaporanKeuanganResult | null>(null);
  const [petugasItem, setPetugasItem] = useState<KhatibJumatSchedule | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      supabase.from(TABEL_UP_BANK).select("*"),
      supabase.from(TABEL_UP_TUNAI).select("*"),
      supabase.from(TABEL_INFAQ_BUKA_PUASA).select("*"),
      supabase.from("khatib_jumat_schedule").select("*").eq("is_active", true).order("tanggal", { ascending: false }),
    ]).then(([upBank, upTunai, bukaPuasa, khatib]) => {
      setUpBankRows((upBank.data as FinancialTransaction[]) ?? []);
      setUpTunaiRows((upTunai.data as FinancialTransaction[]) ?? []);
      setBukaPuasaRows((bukaPuasa.data as FinancialTransaction[]) ?? []);
      const rows = (khatib.data as KhatibJumatSchedule[]) ?? [];
      setKhatibList(rows);
      fetchHijriMap(rows.map((k) => k.tanggal)).then(setHijriMap);
      setLoading(false);
    });
  }, []);

  // Laporan Keuangan dihitung dari gabungan UP Bank + UP Tunai, sama seperti
  // di Dashboard > Keuangan > tab Laporan -- lihat catatan di
  // laporanKeuangan.ts (buildLaporanKeuangan).
  const laporanItems = useMemo(() => [...upBankRows, ...upTunaiRows], [upBankRows, upTunaiRows]);

  const bulanOptions = useMemo(() => bulanOptionsDari(khatibList.map((k) => k.tanggal)), [khatibList]);
  const khatibBulanIni = useMemo(() => khatibList.filter((k) => bulanKeyDari(k.tanggal) === bulan), [khatibList, bulan]);

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div>
        <h1 className="font-serif text-2xl font-bold text-primary-900 mb-1">Laporan</h1>
        <p className="text-sm text-gray-500">
          Lihat & unduh Laporan Keuangan mingguan, buat teks Laporan Jumat siap-tempel, atau bagikan info petugas
          Sholat Jumat ke WA.
        </p>
      </div>

      <section>
        <h2 className="font-serif font-bold text-lg text-primary-900 mb-3">Laporan Keuangan</h2>
        {loading ? (
          <p className="text-sm text-gray-400">Memuat data...</p>
        ) : (
          <LaporanKeuanganTab
            items={laporanItems}
            bukaPuasaItems={bukaPuasaRows}
            extraActions={(laporan) => (
              <button className="btn-secondary text-sm" onClick={() => setLaporanJumat(laporan)}>
                📋 Buat Laporan Jumat
              </button>
            )}
          />
        )}
      </section>

      <section>
        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <h2 className="font-serif font-bold text-lg text-primary-900">Petugas Sholat Jumat</h2>
          <select className="input !w-auto !py-1 !text-xs" value={bulan} onChange={(e) => setBulan(e.target.value)}>
            {bulanOptions.map((b) => (
              <option key={b} value={b}>
                {labelBulan(b)}
              </option>
            ))}
          </select>
        </div>
        {loading && <p className="text-sm text-gray-400">Memuat data...</p>}
        {!loading && khatibBulanIni.length === 0 && (
          <p className="text-sm text-gray-400">Belum ada jadwal Khatib Jumat pada bulan ini.</p>
        )}
        <div className="space-y-2">
          {khatibBulanIni.map((k) => (
            <div key={k.id} className="card flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-gray-800 truncate">{k.nama_ustadz}</p>
                <p className="text-xs text-gray-500">
                  {formatTanggal(k.tanggal)}
                  {hijriMap[k.tanggal] && ` · ${hijriMap[k.tanggal]}`}
                </p>
                {(k.imam || k.muadzin) && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    {k.imam && <>Imam: {k.imam}</>}
                    {k.imam && k.muadzin && " · "}
                    {k.muadzin && <>Muadzin: {k.muadzin}</>}
                  </p>
                )}
              </div>
              <button className="btn-secondary text-sm shrink-0" onClick={() => setPetugasItem(k)}>
                📤 Bagikan
              </button>
            </div>
          ))}
        </div>
      </section>

      {laporanJumat && <LaporanJumatModal laporan={laporanJumat} onClose={() => setLaporanJumat(null)} />}
      {petugasItem && <PetugasJumatModal khatib={petugasItem} onClose={() => setPetugasItem(null)} />}
    </div>
  );
}
