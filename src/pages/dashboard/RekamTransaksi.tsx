import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import {
  DraftTransaction,
  FINANCIAL_JENIS,
  FINANCIAL_KRITERIA,
  FinancialJenis,
  FinancialKriteria,
  FinancialTransaction,
} from "../../types";
import { datetimeLocalToWitaIso, nowWitaDatetimeLocal } from "../../lib/waktu";
import { listKeteranganOptions, listPeriodeOptions, suggestNextPeriode } from "../../lib/saran";
import {
  buildJurnalRows,
  TABEL_BANK,
  TABEL_DONASI,
  TABEL_INFAQ_BUKA_PUASA,
  TABEL_QURBAN,
  TABEL_RAMADHAN,
  TABEL_UP_BANK,
  TABEL_UP_TUNAI,
} from "../../lib/tabelKeuangan";

const emptyForm = {
  jenis: "UP Tunai" as FinancialJenis,
  tanggal: nowWitaDatetimeLocal(),
  periode: "Pekan 1",
  kriteria: "Lainnya" as FinancialKriteria,
  debet: "",
  kredit: "",
  keterangan: "",
};

/**
 * Halaman rekam transaksi cepat khusus HP (dibuka dari tombol "+" bottom nav).
 * Fungsinya sama seperti form manual di Dashboard > Keuangan, tapi tampilan
 * satu kolom & alur "simpan lalu lanjut input lagi" supaya nyaman dipakai
 * berulang-ulang langsung dari lapangan (mis. selesai terima infaq Jumat).
 */
export default function RekamTransaksi() {
  const { user, hasRole } = useAuth();
  const canEdit = hasRole("bendahara"); // admin read-only, sesuai kebijakan moderasi -- halaman ini khusus input

  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedInfo, setSavedInfo] = useState<string | null>(null);

  // Data ringan dari semua tabel keuangan, khusus utk saran otomatis Periode
  // & Keterangan (halaman ini tidak menyimpan data tabel manapun di state
  // untuk keperluan lain -- lihat komentar di submit()).
  const [saranData, setSaranData] = useState<FinancialTransaction[]>([]);
  useEffect(() => {
    Promise.all([
      supabase.from(TABEL_BANK).select("*"),
      supabase.from(TABEL_UP_BANK).select("*"),
      supabase.from(TABEL_UP_TUNAI).select("*"),
      supabase.from(TABEL_INFAQ_BUKA_PUASA).select("*"),
      supabase.from(TABEL_DONASI).select("*"),
      supabase.from(TABEL_RAMADHAN).select("*"),
      supabase.from(TABEL_QURBAN).select("*"),
    ]).then((results) => {
      setSaranData(results.flatMap((r) => (r.data as FinancialTransaction[]) ?? []));
    });
  }, []);
  const periodeOptions = useMemo(() => listPeriodeOptions(saranData), [saranData]);
  const periodeSuggestion = useMemo(() => suggestNextPeriode(saranData), [saranData]);
  const keteranganOptions = useMemo(() => listKeteranganOptions(saranData), [saranData]);
  useEffect(() => {
    // Cuma timpa kalau bendahara belum sempat mengubah dari nilai awal
    // "Pekan 1", supaya tidak menimpa input yang sedang diketik.
    setForm((f) => (f.periode === "Pekan 1" ? { ...f, periode: periodeSuggestion } : f));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodeSuggestion]);

  if (!canEdit) {
    return (
      <div className="max-w-lg mx-auto mt-16 card text-center">
        <h2 className="text-lg font-semibold mb-2">Akses ditolak</h2>
        <p className="text-sm text-gray-600">Kamu tidak memiliki hak akses ke halaman ini.</p>
      </div>
    );
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSavedInfo(null);
    setSaving(true);
    const draftLike: DraftTransaction = {
      tanggal: form.tanggal,
      uraian: "",
      kriteria: form.kriteria,
      debet: Number(form.debet) || 0,
      kredit: Number(form.kredit) || 0,
      keterangan: form.keterangan,
      jenis: form.jenis,
    };
    // Transfer talangan dari UP Tunai utk Buka Puasa (lihat buildJurnalRows)
    // butuh tahu saldo tabel_infaq_buka_puasa saat ini -- halaman ini tidak
    // menyimpan data tabel manapun di state, jadi ambil langsung kalau perlu.
    let bukaPuasaSaldoSaatIni = 0;
    if (draftLike.jenis === "UP Tunai" && draftLike.kriteria === "Infaq Buka Puasa") {
      const { data } = await supabase.from(TABEL_INFAQ_BUKA_PUASA).select("debet,kredit");
      bukaPuasaSaldoSaatIni = (data ?? []).reduce((sum, r) => sum + Number(r.debet) - Number(r.kredit), 0);
    }
    const jurnalRows = buildJurnalRows(draftLike, {
      tanggalIso: datetimeLocalToWitaIso(form.tanggal),
      periode: form.periode,
      createdBy: user?.id ?? null,
      bukaPuasaSaldoSaatIni,
    });
    for (const { table, row } of jurnalRows) {
      const { error: err } = await supabase.from(table).insert(row);
      if (err) {
        setSaving(false);
        setError(`Gagal menyimpan ke tabel "${table}": ` + err.message);
        return;
      }
    }
    setSaving(false);
    setSavedInfo("Transaksi tersimpan.");
    // Reset tapi pertahankan Jenis & Periode supaya input berikutnya lebih cepat.
    // Tanggal diisi ulang dengan waktu WITA saat ini (bukan yang dibekukan
    // saat halaman pertama dibuka), penting karena halaman ini dipakai untuk
    // input berulang-ulang.
    setForm((f) => ({ ...emptyForm, tanggal: nowWitaDatetimeLocal(), jenis: f.jenis, periode: f.periode }));
  };

  return (
    <div className="max-w-md mx-auto pb-6">
      <datalist id="periode-suggestions">
        {periodeOptions.includes(periodeSuggestion) ? null : <option value={periodeSuggestion} />}
        {periodeOptions.map((p) => (
          <option key={p} value={p} />
        ))}
      </datalist>
      <datalist id="keterangan-suggestions">
        {keteranganOptions.map((k) => (
          <option key={k} value={k} />
        ))}
      </datalist>

      <div className="flex items-center justify-between mb-4">
        <h1 className="font-serif text-xl font-bold text-primary-900">Rekam Transaksi</h1>
        <Link to="/dashboard/keuangan" className="text-sm text-primary-700 hover:underline">
          Lihat semua
        </Link>
      </div>

      {savedInfo && (
        <div className="mb-4 rounded-lg bg-primary-50 border border-primary-200 text-primary-800 text-sm px-3 py-2">
          {savedInfo}
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{error}</div>
      )}

      <form onSubmit={submit} className="card flex flex-col gap-3">
        <div>
          <label className="label">Jenis Rekening</label>
          <select
            className="input"
            value={form.jenis}
            onChange={(e) => setForm({ ...form, jenis: e.target.value as FinancialJenis })}
          >
            {FINANCIAL_JENIS.map((j) => (
              <option key={j} value={j}>
                {j}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Tanggal</label>
          <input
            type="datetime-local"
            className="input"
            required
            value={form.tanggal}
            onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
          />
        </div>

        <div>
          <label className="label">Periode</label>
          <input
            className="input"
            required
            value={form.periode}
            onChange={(e) => setForm({ ...form, periode: e.target.value })}
            placeholder="Pekan 1"
            list="periode-suggestions"
          />
        </div>

        <div>
          <label className="label">Kriteria</label>
          <select
            className="input"
            value={form.kriteria}
            onChange={(e) => setForm({ ...form, kriteria: e.target.value as FinancialKriteria })}
          >
            {FINANCIAL_KRITERIA.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Debet (masuk)</label>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            className="input"
            value={form.debet}
            onChange={(e) => setForm({ ...form, debet: e.target.value })}
          />
        </div>

        <div>
          <label className="label">Kredit (keluar)</label>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            className="input"
            value={form.kredit}
            onChange={(e) => setForm({ ...form, kredit: e.target.value })}
          />
        </div>

        <div>
          <label className="label">Keterangan</label>
          <input
            className="input"
            value={form.keterangan}
            onChange={(e) => setForm({ ...form, keterangan: e.target.value })}
            list="keterangan-suggestions"
          />
        </div>

        <div className="pt-1">
          <button className="btn-primary w-full" disabled={saving}>
            {saving ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </form>
    </div>
  );
}
