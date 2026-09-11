import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import { parseBriStatement, parseBsiStatement } from "../../lib/bankStatement";
import { computeRunningSaldo, computeRunningSaldoByJenis, TransactionWithSaldo } from "../../lib/saldo";
import {
  DraftTransaction,
  FINANCIAL_JENIS,
  FINANCIAL_KRITERIA,
  FinancialJenis,
  FinancialKriteria,
  FinancialTransaction,
} from "../../types";

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

const emptyManualForm = {
  jenis: "UP Tunai" as FinancialJenis,
  tanggal: new Date().toISOString().slice(0, 16),
  periode: "Pekan 1",
  kriteria: "Lainnya" as FinancialKriteria,
  debet: "",
  kredit: "",
  keterangan: "",
};

export default function FinancePage() {
  const { user, isAdmin, hasRole } = useAuth();
  const canEdit = hasRole("bendahara"); // admin read-only, sesuai kebijakan moderasi
  const [items, setItems] = useState<FinancialTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>("BRI");

  // -- upload & preview state --
  const [uploadJenis, setUploadJenis] = useState<"BRI" | "BSI" | null>(null);
  const [draftPeriode, setDraftPeriode] = useState("Pekan 1");
  const [drafts, setDrafts] = useState<DraftTransaction[]>([]);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // -- saldo awal & manual form --
  const [showManual, setShowManual] = useState<"saldo_awal" | "manual" | null>(null);
  const [manualForm, setManualForm] = useState(emptyManualForm);

  // -- inline edit existing row --
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ kriteria: FinancialKriteria; keterangan: string } | null>(null);

  const load = () => {
    setLoading(true);
    supabase
      .from("financial_transactions")
      .select("*")
      .then(({ data }) => {
        setItems((data as FinancialTransaction[]) ?? []);
        setLoading(false);
      });
  };

  useEffect(() => {
    load();
  }, []);

  const byJenis = useMemo(() => computeRunningSaldoByJenis(items), [items]);
  const combinedRows = useMemo(() => computeRunningSaldo(items), [items]);
  const isRekap = activeTab === "Rekapitulasi";
  const currentRows: TransactionWithSaldo[] = isRekap ? combinedRows : byJenis[activeTab] ?? [];
  const saldoTerkini = currentRows.length > 0 ? currentRows[currentRows.length - 1].saldo : 0;

  const handlePickFile = (jenis: "BRI" | "BSI") => {
    setUploadJenis(jenis);
    setParseError(null);
    setDrafts([]);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !uploadJenis) return;
    setParsing(true);
    setParseError(null);
    try {
      const parsed = uploadJenis === "BRI" ? await parseBriStatement(file) : await parseBsiStatement(file);
      if (parsed.length === 0) {
        setParseError("Tidak ada baris transaksi yang terbaca dari file ini. Pastikan formatnya sesuai.");
      }
      setDrafts(parsed);
    } catch (err) {
      setParseError("Gagal membaca file: " + (err as Error).message);
    }
    setParsing(false);
  };

  const updateDraft = (idx: number, patch: Partial<DraftTransaction>) => {
    setDrafts((ds) => ds.map((d, i) => (i === idx ? { ...d, ...patch } : d)));
  };
  const removeDraft = (idx: number) => {
    setDrafts((ds) => ds.filter((_, i) => i !== idx));
  };

  const submitDrafts = async () => {
    if (!uploadJenis || drafts.length === 0) return;
    setSubmitting(true);
    const rows = drafts.map((d) => ({
      tanggal: d.tanggal,
      periode: draftPeriode,
      uraian: d.uraian,
      kriteria: d.kriteria,
      debet: d.debet,
      kredit: d.kredit,
      keterangan: d.keterangan,
      jenis: uploadJenis,
      created_by: user?.id ?? null,
    }));
    const { error } = await supabase.from("financial_transactions").insert(rows);
    setSubmitting(false);
    if (error) {
      setParseError("Gagal menyimpan ke database: " + error.message);
      return;
    }
    setDrafts([]);
    setUploadJenis(null);
    load();
  };

  const cancelDrafts = () => {
    setDrafts([]);
    setUploadJenis(null);
    setParseError(null);
  };

  const submitManual = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const isSaldoAwal = showManual === "saldo_awal";
    const { error } = await supabase.from("financial_transactions").insert({
      tanggal: manualForm.tanggal || null,
      periode: manualForm.periode,
      uraian: null,
      kriteria: isSaldoAwal ? "Saldo Awal" : manualForm.kriteria,
      debet: Number(manualForm.debet) || 0,
      kredit: isSaldoAwal ? 0 : Number(manualForm.kredit) || 0,
      keterangan: manualForm.keterangan || (isSaldoAwal ? "Saldo Awal" : null),
      jenis: manualForm.jenis,
      created_by: user?.id ?? null,
    });
    setSubmitting(false);
    if (error) {
      alert("Gagal menyimpan: " + error.message);
      return;
    }
    setManualForm(emptyManualForm);
    setShowManual(null);
    load();
  };

  const startEdit = (row: FinancialTransaction) => {
    setEditingId(row.id);
    setEditForm({ kriteria: row.kriteria, keterangan: row.keterangan ?? "" });
  };
  const saveEdit = async (id: string) => {
    if (!editForm) return;
    await supabase
      .from("financial_transactions")
      .update({ kriteria: editForm.kriteria, keterangan: editForm.keterangan })
      .eq("id", id);
    setEditingId(null);
    load();
  };
  const removeRow = async (id: string) => {
    if (!confirm("Hapus transaksi ini?")) return;
    await supabase.from("financial_transactions").delete().eq("id", id);
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h1 className="font-serif text-2xl font-bold text-primary-900">Keuangan</h1>
        {!canEdit && (
          <span className="badge bg-gray-100 text-gray-500">
            {isAdmin ? "Mode lihat saja (admin)" : "Mode lihat saja"}
          </span>
        )}
      </div>

      {canEdit && (
        <div className="card mb-6">
          <div className="flex flex-wrap gap-2 mb-1">
            <button className="btn-primary" onClick={() => handlePickFile("BRI")}>
              📥 Upload Rek. Koran BRI
            </button>
            <button className="btn-primary" onClick={() => handlePickFile("BSI")}>
              📥 Upload Rek. Koran BSI
            </button>
            <button className="btn-gold" onClick={() => setShowManual("saldo_awal")}>
              🏁 Rekam Saldo Awal
            </button>
            <button className="btn-secondary" onClick={() => setShowManual("manual")}>
              + Transaksi Manual
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={handleFileChange}
          />
          {parsing && <p className="text-sm text-gray-400 mt-2">Membaca file...</p>}
          {parseError && <p className="text-sm text-red-600 mt-2">{parseError}</p>}
        </div>
      )}

      {/* ---- Preview & edit hasil upload sebelum disimpan ---- */}
      {uploadJenis && drafts.length > 0 && (
        <div className="card mb-6 border-2 border-primary-300">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <h2 className="font-semibold text-gray-800">
              Pratinjau Upload {uploadJenis} — {drafts.length} baris
            </h2>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Periode:</label>
              <input
                className="input !w-36"
                value={draftPeriode}
                onChange={(e) => setDraftPeriode(e.target.value)}
                placeholder="Pekan 1"
                list="periode-suggestions"
              />
              <datalist id="periode-suggestions">
                {Array.from({ length: 20 }, (_, i) => `Pekan ${i + 1}`).map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="py-1 pr-2">Tanggal</th>
                  <th className="py-1 pr-2">Uraian Asli</th>
                  <th className="py-1 pr-2">Kriteria</th>
                  <th className="py-1 pr-2 text-right">Debet</th>
                  <th className="py-1 pr-2 text-right">Kredit</th>
                  <th className="py-1 pr-2">Keterangan</th>
                  <th className="py-1 pr-2"></th>
                </tr>
              </thead>
              <tbody>
                {drafts.map((d, idx) => (
                  <tr key={idx} className="border-b last:border-0 align-top">
                    <td className="py-1 pr-2 whitespace-nowrap">
                      <input
                        type="datetime-local"
                        step={1}
                        className="input !text-xs !py-1 !w-44"
                        value={d.tanggal}
                        onChange={(e) => updateDraft(idx, { tanggal: e.target.value })}
                      />
                    </td>
                    <td className="py-1 pr-2 max-w-[220px] text-gray-500">{d.uraian}</td>
                    <td className="py-1 pr-2">
                      <select
                        className="input !text-xs !py-1"
                        value={d.kriteria}
                        onChange={(e) => updateDraft(idx, { kriteria: e.target.value as FinancialKriteria })}
                      >
                        {FINANCIAL_KRITERIA.map((k) => (
                          <option key={k} value={k}>
                            {k}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-1 pr-2">
                      <input
                        type="number"
                        className="input !text-xs !py-1 !w-28 text-right"
                        value={d.debet}
                        onChange={(e) => updateDraft(idx, { debet: Number(e.target.value) })}
                      />
                    </td>
                    <td className="py-1 pr-2">
                      <input
                        type="number"
                        className="input !text-xs !py-1 !w-28 text-right"
                        value={d.kredit}
                        onChange={(e) => updateDraft(idx, { kredit: Number(e.target.value) })}
                      />
                    </td>
                    <td className="py-1 pr-2">
                      <input
                        className="input !text-xs !py-1 !w-40"
                        value={d.keterangan}
                        onChange={(e) => updateDraft(idx, { keterangan: e.target.value })}
                      />
                    </td>
                    <td className="py-1 pr-2">
                      <button className="text-red-500" onClick={() => removeDraft(idx)}>
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-2 mt-4">
            <button className="btn-primary" disabled={submitting} onClick={submitDrafts}>
              {submitting ? "Menyimpan..." : `Simpan ${drafts.length} Transaksi ke Database`}
            </button>
            <button className="btn-secondary" onClick={cancelDrafts}>
              Batal
            </button>
          </div>
        </div>
      )}

      {/* ---- Form Saldo Awal / Manual ---- */}
      {showManual && (
        <form onSubmit={submitManual} className="card mb-6 grid sm:grid-cols-3 gap-3">
          <h2 className="sm:col-span-3 font-semibold text-gray-800">
            {showManual === "saldo_awal" ? "Rekam Saldo Awal" : "Tambah Transaksi Manual"}
          </h2>
          <div>
            <label className="label">Jenis Rekening</label>
            <select
              className="input"
              value={manualForm.jenis}
              onChange={(e) => setManualForm({ ...manualForm, jenis: e.target.value as FinancialJenis })}
            >
              {FINANCIAL_JENIS.map((j) => (
                <option key={j} value={j}>
                  {j}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Tanggal {showManual === "saldo_awal" && "(opsional)"}</label>
            <input
              type="datetime-local"
              className="input"
              required={showManual !== "saldo_awal"}
              value={manualForm.tanggal}
              onChange={(e) => setManualForm({ ...manualForm, tanggal: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Periode</label>
            <input
              className="input"
              required
              value={manualForm.periode}
              onChange={(e) => setManualForm({ ...manualForm, periode: e.target.value })}
              placeholder="Pekan 1"
            />
          </div>
          {showManual === "manual" && (
            <div>
              <label className="label">Kriteria</label>
              <select
                className="input"
                value={manualForm.kriteria}
                onChange={(e) => setManualForm({ ...manualForm, kriteria: e.target.value as FinancialKriteria })}
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
            <label className="label">{showManual === "saldo_awal" ? "Nominal Saldo Awal" : "Debet (masuk)"}</label>
            <input
              type="number"
              min={0}
              className="input"
              value={manualForm.debet}
              onChange={(e) => setManualForm({ ...manualForm, debet: e.target.value })}
            />
          </div>
          {showManual === "manual" && (
            <div>
              <label className="label">Kredit (keluar)</label>
              <input
                type="number"
                min={0}
                className="input"
                value={manualForm.kredit}
                onChange={(e) => setManualForm({ ...manualForm, kredit: e.target.value })}
              />
            </div>
          )}
          <div className="sm:col-span-3">
            <label className="label">Keterangan</label>
            <input
              className="input"
              value={manualForm.keterangan}
              onChange={(e) => setManualForm({ ...manualForm, keterangan: e.target.value })}
              placeholder={showManual === "saldo_awal" ? "Saldo Awal" : ""}
            />
          </div>
          <div className="sm:col-span-3 flex gap-2">
            <button className="btn-primary" disabled={submitting}>
              {submitting ? "Menyimpan..." : "Simpan"}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setShowManual(null);
                setManualForm(emptyManualForm);
              }}
            >
              Batal
            </button>
          </div>
        </form>
      )}

      {/* ---- Tabel transaksi per Jenis rekening / Rekapitulasi gabungan ---- */}
      <div className="flex gap-2 mb-3">
        {TABS.map((j) => (
          <button
            key={j}
            onClick={() => setActiveTab(j)}
            className={`badge border ${
              activeTab === j ? "bg-primary-700 text-white border-primary-700" : "bg-white text-gray-500 border-gray-200"
            }`}
          >
            {j}
          </button>
        ))}
      </div>

      <div className="card mb-3 flex items-center justify-between">
        <span className="text-sm text-gray-500">
          {isRekap ? "Saldo Gabungan (BRI + BSI + UP Tunai) saat ini" : `Saldo ${activeTab} saat ini`}
        </span>
        <span className="text-xl font-bold text-primary-800">{formatRupiah(saldoTerkini)}</span>
      </div>

      <div className="card overflow-x-auto">
        {loading && <p className="text-sm text-gray-400">Memuat data...</p>}
        {!loading && currentRows.length === 0 && (
          <p className="text-sm text-gray-400">Belum ada transaksi untuk {activeTab}.</p>
        )}
        {currentRows.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="py-2 pr-3">Tanggal</th>
                {isRekap && <th className="py-2 pr-3">Jenis</th>}
                <th className="py-2 pr-3">Periode</th>
                <th className="py-2 pr-3">Kriteria</th>
                <th className="py-2 pr-3">Keterangan</th>
                <th className="py-2 pr-3 text-right">Debet</th>
                <th className="py-2 pr-3 text-right">Kredit</th>
                <th className="py-2 pr-3 text-right">Saldo</th>
                {canEdit && <th className="py-2 pr-3"></th>}
              </tr>
            </thead>
            <tbody>
              {currentRows.map((t) => (
                <tr key={t.id} className="border-b last:border-0">
                  <td className="py-2 pr-3 whitespace-nowrap">{formatTanggal(t.tanggal)}</td>
                  {isRekap && (
                    <td className="py-2 pr-3 whitespace-nowrap">
                      <span className="badge bg-primary-50 text-primary-700">{t.jenis}</span>
                    </td>
                  )}
                  <td className="py-2 pr-3 whitespace-nowrap text-gray-500">{t.periode}</td>
                  <td className="py-2 pr-3">
                    {editingId === t.id ? (
                      <select
                        className="input !text-xs !py-1"
                        value={editForm?.kriteria}
                        onChange={(e) => setEditForm((f) => (f ? { ...f, kriteria: e.target.value as FinancialKriteria } : f))}
                      >
                        {FINANCIAL_KRITERIA.map((k) => (
                          <option key={k} value={k}>
                            {k}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="badge bg-gray-100 text-gray-600">{t.kriteria}</span>
                    )}
                  </td>
                  <td className="py-2 pr-3 text-gray-500 max-w-[200px]">
                    {editingId === t.id ? (
                      <input
                        className="input !text-xs !py-1"
                        value={editForm?.keterangan}
                        onChange={(e) => setEditForm((f) => (f ? { ...f, keterangan: e.target.value } : f))}
                      />
                    ) : (
                      t.keterangan
                    )}
                  </td>
                  <td className="py-2 pr-3 text-right text-primary-700">
                    {t.debet > 0 ? formatRupiah(t.debet) : ""}
                  </td>
                  <td className="py-2 pr-3 text-right text-red-600">{t.kredit > 0 ? formatRupiah(t.kredit) : ""}</td>
                  <td className="py-2 pr-3 text-right font-medium">{formatRupiah(t.saldo)}</td>
                  {canEdit && (
                    <td className="py-2 pr-3 whitespace-nowrap">
                      {editingId === t.id ? (
                        <>
                          <button className="text-primary-700 text-xs mr-2" onClick={() => saveEdit(t.id)}>
                            Simpan
                          </button>
                          <button className="text-gray-400 text-xs" onClick={() => setEditingId(null)}>
                            Batal
                          </button>
                        </>
                      ) : (
                        <>
                          <button className="text-primary-700 text-xs mr-2" onClick={() => startEdit(t)}>
                            Sunting
                          </button>
                          <button className="text-red-500 text-xs" onClick={() => removeRow(t.id)}>
                            Hapus
                          </button>
                        </>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
