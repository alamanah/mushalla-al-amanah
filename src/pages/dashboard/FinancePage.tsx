import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import { parseBriStatement, parseBsiStatement, splitDuplicates } from "../../lib/bankStatement";
import { computeRunningSaldo, computeRunningSaldoByJenis, TransactionWithSaldo } from "../../lib/saldo";
import { isBukaPuasa, KRITERIA_DONASI, KRITERIA_QURBAN, KRITERIA_RAMADHAN } from "../../lib/laporanKeuangan";
import { datetimeLocalToWitaIso, formatWita, nowWitaDatetimeLocal, toWitaDatetimeLocal } from "../../lib/waktu";
import LaporanKeuanganTab from "./LaporanKeuanganTab";
import {
  DraftTransaction,
  FINANCIAL_JENIS,
  FINANCIAL_KRITERIA,
  FinancialJenis,
  FinancialKriteria,
  FinancialTransaction,
} from "../../types";

function EyeIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

function formatTanggal(t: string | null) {
  return formatWita(t, { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

type ActiveTab = FinancialJenis | "Rekapitulasi" | "Qurban" | "Donasi" | "Ramadhan" | "Buka Puasa" | "Laporan";
const TABS: ActiveTab[] = [...FINANCIAL_JENIS, "Rekapitulasi", "Qurban", "Donasi", "Ramadhan", "Buka Puasa", "Laporan"];
const PAGE_SIZES = [25, 50, 100] as const;

const emptyManualForm = {
  jenis: "UP Tunai" as FinancialJenis,
  tanggal: nowWitaDatetimeLocal(),
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
  const [skippedInfo, setSkippedInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // -- saldo awal & manual form --
  const [showManual, setShowManual] = useState<"saldo_awal" | "manual" | null>(null);
  const [manualForm, setManualForm] = useState(emptyManualForm);

  // -- inline edit existing row --
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ tanggal: string; kriteria: FinancialKriteria; keterangan: string } | null>(
    null
  );

  // -- pilih banyak untuk hapus massal --
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // -- detail transaksi --
  const [detailRow, setDetailRow] = useState<TransactionWithSaldo | null>(null);

  // -- paginasi --
  const [pageSize, setPageSize] = useState<number>(25);
  const [page, setPage] = useState(1);

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

  // Kas UP Tunai: baris Kriteria "Setor UP Tunai" sekarang selalu dibuat
  // sudah benar di Debet sejak awal (lihat fitur jurnal kontra saat upload
  // rekening koran & input manual), jadi ditampilkan apa adanya tanpa
  // ditukar lagi -- tidak ada lagi normalisasi Debet/Kredit di sini.
  const byJenis = useMemo(() => computeRunningSaldoByJenis(items), [items]);
  const combinedRows = useMemo(() => computeRunningSaldo(items), [items]);
  const qurbanRows = useMemo(
    () => computeRunningSaldo(items.filter((t) => KRITERIA_QURBAN.includes(t.kriteria))),
    [items]
  );
  const donasiRows = useMemo(
    () => computeRunningSaldo(items.filter((t) => KRITERIA_DONASI.includes(t.kriteria))),
    [items]
  );
  const ramadhanRows = useMemo(
    () => computeRunningSaldo(items.filter((t) => KRITERIA_RAMADHAN.includes(t.kriteria))),
    [items]
  );
  const bukaPuasaRows = useMemo(() => computeRunningSaldo(items.filter((t) => isBukaPuasa(t))), [items]);

  const isRekap = activeTab === "Rekapitulasi";
  const isLaporan = activeTab === "Laporan";
  const isMultiJenis =
    isRekap ||
    activeTab === "Qurban" ||
    activeTab === "Donasi" ||
    activeTab === "Ramadhan" ||
    activeTab === "Buka Puasa";

  const currentRows: TransactionWithSaldo[] = isRekap
    ? combinedRows
    : activeTab === "Qurban"
    ? qurbanRows
    : activeTab === "Donasi"
    ? donasiRows
    : activeTab === "Ramadhan"
    ? ramadhanRows
    : activeTab === "Buka Puasa"
    ? bukaPuasaRows
    : isLaporan
    ? []
    : byJenis[activeTab] ?? [];
  const saldoTerkini = currentRows.length > 0 ? currentRows[currentRows.length - 1].saldo : 0;

  // Saldo berjalan dihitung urut kronologis (lama -> baru), tapi di tabel
  // ditampilkan terbalik (baru -> lama) supaya transaksi terbaru selalu
  // terlihat di baris paling atas tanpa perlu pindah halaman.
  const displayRows = useMemo(() => [...currentRows].reverse(), [currentRows]);

  const totalPages = Math.max(1, Math.ceil(displayRows.length / pageSize));
  const pageRows = displayRows.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setSelectedIds(new Set());
    // Transaksi terbaru ada di halaman 1 (lihat displayRows di atas), jadi
    // cukup kembali ke halaman 1 setiap kali tab/pageSize/data berubah.
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, pageSize, items.length]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allSelected = pageRows.length > 0 && pageRows.every((r) => selectedIds.has(r.id));
  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      if (allSelected) {
        const next = new Set(prev);
        pageRows.forEach((r) => next.delete(r.id));
        return next;
      }
      return new Set([...prev, ...pageRows.map((r) => r.id)]);
    });
  };

  const bulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Hapus ${selectedIds.size} transaksi terpilih? Tindakan ini tidak bisa dibatalkan.`)) return;
    setBulkDeleting(true);
    const { error } = await supabase.from("financial_transactions").delete().in("id", Array.from(selectedIds));
    setBulkDeleting(false);
    if (error) {
      alert("Gagal menghapus: " + error.message);
      return;
    }
    setSelectedIds(new Set());
    load();
  };

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
    setSkippedInfo(null);
    try {
      const parsed = uploadJenis === "BRI" ? await parseBriStatement(file) : await parseBsiStatement(file);
      if (parsed.length === 0) {
        setParseError("Tidak ada baris transaksi yang terbaca dari file ini. Pastikan formatnya sesuai.");
      }
      const existingForJenis = items.filter((it) => it.jenis === uploadJenis);
      const { unique, duplicateCount } = splitDuplicates(parsed, existingForJenis);
      if (duplicateCount > 0) {
        setSkippedInfo(
          `${duplicateCount} baris dilewati otomatis karena tanggal & nominalnya persis sama dengan transaksi ${uploadJenis} yang sudah ada di database (kemungkinan tumpang tindih dengan unggahan sebelumnya).`
        );
      }
      setDrafts(unique);
    } catch (err) {
      setParseError("Gagal membaca file: " + (err as Error).message);
    }
    setParsing(false);
  };

  const updateDraft = (idx: number, patch: Partial<DraftTransaction>) => {
    // Memilih Jenis "UP Tunai" pada baris upload rekening koran BUKAN untuk
    // mengubah baris itu sendiri, tapi untuk MEMICU PENAMBAHAN baris jurnal
    // kontra baru -- baris asal (BRI/BSI) tetap apa adanya sesuai data
    // rekening koran (jejaknya tidak boleh berubah). Baris baru itu adalah
    // duplikat baris asal dengan nominal kontra (Debet<->Kredit ditukar),
    // Jenis "UP Tunai", Kriteria "Setor UP Tunai" (bisa disunting lagi kalau
    // ternyata arahnya "Terima UP Tunai").
    if (patch.jenis === "UP Tunai") {
      setDrafts((ds) => {
        const src = ds[idx];
        if (!src || src.jenis === "UP Tunai") return ds;
        const kontra: DraftTransaction = {
          ...src,
          jenis: "UP Tunai",
          kriteria: "Setor UP Tunai",
          debet: src.kredit,
          kredit: src.debet,
        };
        const next = [...ds];
        next.splice(idx + 1, 0, kontra);
        return next;
      });
      return;
    }
    setDrafts((ds) => ds.map((d, i) => (i === idx ? { ...d, ...patch } : d)));
  };
  const removeDraft = (idx: number) => {
    setDrafts((ds) => ds.filter((_, i) => i !== idx));
  };

  const submitDrafts = async () => {
    if (!uploadJenis || drafts.length === 0) return;
    setSubmitting(true);
    const rows = drafts.map((d) => ({
      tanggal: datetimeLocalToWitaIso(d.tanggal),
      periode: draftPeriode,
      uraian: d.uraian,
      kriteria: d.kriteria,
      debet: d.debet,
      kredit: d.kredit,
      keterangan: d.keterangan,
      jenis: d.jenis,
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
    setSkippedInfo(null);
    load();
  };

  const cancelDrafts = () => {
    setDrafts([]);
    setUploadJenis(null);
    setParseError(null);
    setSkippedInfo(null);
  };

  const submitManual = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const isSaldoAwal = showManual === "saldo_awal";
    const { error } = await supabase.from("financial_transactions").insert({
      tanggal: datetimeLocalToWitaIso(manualForm.tanggal),
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
    setEditForm({
      tanggal: toWitaDatetimeLocal(row.tanggal),
      kriteria: row.kriteria,
      keterangan: row.keterangan ?? "",
    });
  };
  const saveEdit = async (id: string) => {
    if (!editForm) return;
    await supabase
      .from("financial_transactions")
      .update({
        tanggal: datetimeLocalToWitaIso(editForm.tanggal),
        kriteria: editForm.kriteria,
        keterangan: editForm.keterangan,
      })
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
          {skippedInfo && <p className="text-sm text-primary-700 mt-2">ℹ️ {skippedInfo}</p>}
        </div>
      )}

      {/* ---- Preview & edit hasil upload sebelum disimpan ---- */}
      {uploadJenis && drafts.length > 0 && (
        <div className="card mb-6 border-2 border-primary-300">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
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
          <p className="text-xs text-gray-500 mb-3">
            Pilih Jenis <b>"UP Tunai"</b> pada baris yang uangnya masuk/keluar ke kas tunai (mis. tarik tunai dari
            bank) untuk <b>menambah baris jurnal kontra baru</b> secara otomatis (nominal dibalik, Kriteria "Setor UP
            Tunai") -- baris {uploadJenis} aslinya tidak berubah.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="py-1 pr-2">Tanggal</th>
                  <th className="py-1 pr-2">Uraian Asli</th>
                  <th className="py-1 pr-2 whitespace-nowrap">Jenis</th>
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
                        className="input !text-xs !py-1 !w-40"
                        value={d.jenis}
                        onChange={(e) => updateDraft(idx, { jenis: e.target.value as FinancialJenis })}
                      >
                        {FINANCIAL_JENIS.map((j) => (
                          <option key={j} value={j}>
                            {j}
                          </option>
                        ))}
                      </select>
                    </td>
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

      {isLaporan ? (
        <LaporanKeuanganTab items={items} />
      ) : (
        <>
      <div className="card mb-3 flex items-center justify-between">
        <span className="text-sm text-gray-500">
          {isRekap ? "Saldo Gabungan (BRI + BSI + UP Tunai) saat ini" : `Saldo ${activeTab} saat ini`}
        </span>
        <span className="text-xl font-bold text-primary-800">{formatRupiah(saldoTerkini)}</span>
      </div>

      {canEdit && selectedIds.size > 0 && (
        <div className="card mb-3 flex items-center justify-between bg-red-50 border border-red-200">
          <span className="text-sm text-red-700">{selectedIds.size} transaksi dipilih</span>
          <div className="flex gap-2">
            <button className="text-xs text-gray-500 hover:underline" onClick={() => setSelectedIds(new Set())}>
              Batal Pilih
            </button>
            <button className="btn-danger !py-1 !px-3 text-xs" disabled={bulkDeleting} onClick={bulkDelete}>
              {bulkDeleting ? "Menghapus..." : `Hapus ${selectedIds.size} Terpilih`}
            </button>
          </div>
        </div>
      )}

      <div className="card overflow-x-auto">
        {loading && <p className="text-sm text-gray-400">Memuat data...</p>}
        {!loading && currentRows.length === 0 && (
          <p className="text-sm text-gray-400">Belum ada transaksi untuk {activeTab}.</p>
        )}
        {currentRows.length > 0 && (
          <div className="max-h-[70vh] overflow-y-auto">
          <table className="w-full text-sm table-fixed">
            <colgroup>
              {canEdit && <col className="w-8" />}
              <col className="w-36" />
              {isMultiJenis && <col className="w-32" />}
              <col className="w-24" />
              <col className="w-32" />
              <col />
              <col className="w-32" />
              <col className="w-32" />
              <col className="w-32" />
              <col className="w-24" />
            </colgroup>
            <thead>
              <tr className="text-left text-gray-500 border-b bg-white sticky top-0 z-10 shadow-sm">
                {canEdit && (
                  <th className="py-2 pr-2 bg-white">
                    <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} />
                  </th>
                )}
                <th className="py-2 pr-3 bg-white">Tanggal</th>
                {isMultiJenis && <th className="py-2 pr-3 bg-white">Jenis</th>}
                <th className="py-2 pr-3 bg-white">Periode</th>
                <th className="py-2 pr-3 bg-white">Kriteria</th>
                <th className="py-2 pr-3 bg-white">Keterangan</th>
                <th className="py-2 pr-3 text-right bg-white">Debet</th>
                <th className="py-2 pr-3 text-right bg-white">Kredit</th>
                <th className="py-2 pr-3 text-right bg-white">Saldo</th>
                <th className="py-2 pr-3 text-center bg-white">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((t) => (
                <tr key={t.id} className={`border-b last:border-0 ${selectedIds.has(t.id) ? "bg-red-50/50" : ""}`}>
                  {canEdit && (
                    <td className="py-2 pr-2">
                      <input type="checkbox" checked={selectedIds.has(t.id)} onChange={() => toggleSelect(t.id)} />
                    </td>
                  )}
                  <td className="py-2 pr-3 truncate" title={formatTanggal(t.tanggal)}>
                    {editingId === t.id ? (
                      <input
                        type="datetime-local"
                        className="input !text-xs !py-1 !w-40"
                        value={editForm?.tanggal}
                        onChange={(e) => setEditForm((f) => (f ? { ...f, tanggal: e.target.value } : f))}
                      />
                    ) : (
                      formatTanggal(t.tanggal)
                    )}
                  </td>
                  {isMultiJenis && (
                    <td className="py-2 pr-3 whitespace-nowrap">
                      <span className="badge bg-primary-50 text-primary-700">{t.jenis}</span>
                    </td>
                  )}
                  <td className="py-2 pr-3 truncate text-gray-500">{t.periode}</td>
                  <td className="py-2 pr-3 truncate">
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
                  <td className="py-2 pr-3 text-gray-500 truncate" title={t.keterangan ?? undefined}>
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
                  <td className="py-2 pr-3 text-right text-primary-700 truncate">
                    {t.debet > 0 ? formatRupiah(t.debet) : ""}
                  </td>
                  <td className="py-2 pr-3 text-right text-red-600 truncate">
                    {t.kredit > 0 ? formatRupiah(t.kredit) : ""}
                  </td>
                  <td className="py-2 pr-3 text-right font-medium truncate">{formatRupiah(t.saldo)}</td>
                  <td className="py-2 pr-3 whitespace-nowrap text-center">
                    {editingId === t.id ? (
                      <>
                        <button className="text-primary-700 mr-2" title="Simpan" onClick={() => saveEdit(t.id)}>
                          💾
                        </button>
                        <button className="text-gray-400" title="Batal" onClick={() => setEditingId(null)}>
                          ✕
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className="mr-2 text-gray-500 hover:text-primary-700 align-middle"
                          title="Lihat Detail"
                          onClick={() => setDetailRow(t)}
                        >
                          <EyeIcon className="w-4 h-4 inline" />
                        </button>
                        {canEdit && (
                          <>
                            <button className="mr-2" title="Sunting" onClick={() => startEdit(t)}>
                              ✏️
                            </button>
                            <button title="Hapus" onClick={() => removeRow(t.id)}>
                              🗑️
                            </button>
                          </>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}

        {currentRows.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 mt-1 border-t text-xs text-gray-500">
            <div className="flex items-center gap-2">
              <span>Tampilkan</span>
              <select
                className="input !w-auto !py-1 !text-xs"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
              >
                {PAGE_SIZES.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <span>baris / halaman &middot; {currentRows.length} total transaksi</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="btn-secondary !py-1 !px-2 text-xs"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                ‹ Sebelumnya
              </button>
              <span>
                Halaman {page} dari {totalPages}
              </span>
              <button
                className="btn-secondary !py-1 !px-2 text-xs"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Berikutnya ›
              </button>
            </div>
          </div>
        )}
      </div>
      </>
      )}

      {/* ---- Modal Detail Transaksi ---- */}
      {detailRow && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => setDetailRow(null)}
        >
          <div className="card max-w-md w-full space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-800">Detail Transaksi</h2>
              <button className="text-gray-400 hover:text-gray-600" onClick={() => setDetailRow(null)}>
                ✕
              </button>
            </div>
            <dl className="text-sm divide-y">
              {[
                ["Tanggal", formatTanggal(detailRow.tanggal)],
                ["Jenis", detailRow.jenis],
                ["Periode", detailRow.periode],
                ["Kriteria", detailRow.kriteria],
                ["Uraian Asli", detailRow.uraian || "-"],
                ["Keterangan", detailRow.keterangan || "-"],
                ["Debet", detailRow.debet > 0 ? formatRupiah(detailRow.debet) : "-"],
                ["Kredit", detailRow.kredit > 0 ? formatRupiah(detailRow.kredit) : "-"],
                ["Saldo Berjalan", formatRupiah(detailRow.saldo)],
                ["Dicatat", formatTanggal(detailRow.created_at)],
              ].map(([label, value]) => (
                <div key={label} className="flex gap-3 py-2 first:pt-0 last:pb-0">
                  <span className="w-32 shrink-0 text-gray-400">{label}</span>
                  <span className="text-gray-800 break-words">{value}</span>
                </div>
              ))}
            </dl>
          </div>
        </div>
      )}
    </div>
  );
}
