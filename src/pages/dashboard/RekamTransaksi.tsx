import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import { DraftTransaction, FINANCIAL_JENIS, FINANCIAL_KRITERIA, FinancialJenis, FinancialKriteria } from "../../types";
import { datetimeLocalToWitaIso, nowWitaDatetimeLocal } from "../../lib/waktu";
import { buildJurnalRows } from "../../lib/tabelKeuangan";

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
  const navigate = useNavigate();
  const canEdit = hasRole("bendahara"); // admin read-only, sesuai kebijakan moderasi -- halaman ini khusus input

  const [mode, setMode] = useState<"manual" | "saldo_awal">("manual");
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedInfo, setSavedInfo] = useState<string | null>(null);

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
    const isSaldoAwal = mode === "saldo_awal";
    setSaving(true);
    const draftLike: DraftTransaction = {
      tanggal: form.tanggal,
      uraian: "",
      kriteria: isSaldoAwal ? "Saldo Awal" : form.kriteria,
      debet: Number(form.debet) || 0,
      kredit: isSaldoAwal ? 0 : Number(form.kredit) || 0,
      keterangan: form.keterangan || (isSaldoAwal ? "Saldo Awal" : ""),
      jenis: form.jenis,
    };
    const jurnalRows = buildJurnalRows(draftLike, {
      tanggalIso: datetimeLocalToWitaIso(form.tanggal),
      periode: form.periode,
      createdBy: user?.id ?? null,
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
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-serif text-xl font-bold text-primary-900">Rekam Transaksi</h1>
        <Link to="/dashboard/keuangan" className="text-sm text-primary-700 hover:underline">
          Lihat semua
        </Link>
      </div>

      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => setMode("manual")}
          className={`flex-1 rounded-lg py-2 text-sm font-medium ${
            mode === "manual" ? "bg-primary-700 text-white" : "bg-white border border-gray-200 text-gray-600"
          }`}
        >
          Transaksi
        </button>
        <button
          type="button"
          onClick={() => setMode("saldo_awal")}
          className={`flex-1 rounded-lg py-2 text-sm font-medium ${
            mode === "saldo_awal" ? "bg-primary-700 text-white" : "bg-white border border-gray-200 text-gray-600"
          }`}
        >
          Saldo Awal
        </button>
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
          <label className="label">Tanggal {mode === "saldo_awal" && "(opsional)"}</label>
          <input
            type="datetime-local"
            className="input"
            required={mode !== "saldo_awal"}
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
          />
        </div>

        {mode === "manual" && (
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
        )}

        <div>
          <label className="label">{mode === "saldo_awal" ? "Nominal Saldo Awal" : "Debet (masuk)"}</label>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            className="input"
            value={form.debet}
            onChange={(e) => setForm({ ...form, debet: e.target.value })}
          />
        </div>

        {mode === "manual" && (
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
        )}

        <div>
          <label className="label">Keterangan</label>
          <input
            className="input"
            value={form.keterangan}
            onChange={(e) => setForm({ ...form, keterangan: e.target.value })}
            placeholder={mode === "saldo_awal" ? "Saldo Awal" : ""}
          />
        </div>

        <div className="flex gap-2 pt-1">
          <button className="btn-primary flex-1" disabled={saving}>
            {saving ? "Menyimpan..." : "Simpan"}
          </button>
          <button type="button" className="btn-secondary" onClick={() => navigate("/dashboard")}>
            Selesai
          </button>
        </div>
      </form>
    </div>
  );
}
