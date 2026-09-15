import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import { InventoryCategory, InventoryDisposal, InventoryDisposalTipe, InventoryItem } from "../../types";

function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

function formatTanggal(t: string | null) {
  if (!t) return "-";
  return new Date(t).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4">
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DetailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4">
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4">
      <path d="M4 7h16M9 7V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V7m2 0-.7 12.1a2 2 0 0 1-2 1.9H9.7a2 2 0 0 1-2-1.9L7 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4">
      <path
        d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2l1-1.6A1 1 0 0 1 9.36 5h5.28a1 1 0 0 1 .86.4L16.5 7h2A1.5 1.5 0 0 1 20 8.5v9A1.5 1.5 0 0 1 18.5 19h-13A1.5 1.5 0 0 1 4 17.5Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="13" r="3.2" />
    </svg>
  );
}

const KONDISI_OPTIONS = ["Baik", "Rusak Ringan", "Rusak Berat"];

const emptyForm = {
  kategori_kode: "",
  nama_barang: "",
  jumlah: "1",
  nilai: "0",
  kondisi: "Baik",
  lokasi: "",
  tahun_perolehan: String(new Date().getFullYear()),
};

type DisposalStep = null | "choose" | "hibah" | "hapus";

const emptyDisposalForm = {
  jumlah: "1",
  hibah_kepada: "",
  alasan_hapus: "",
  tanggal: new Date().toISOString().slice(0, 10),
  keterangan: "",
};

export default function InventoryPage() {
  const { user, profile, isAdmin, hasRole } = useAuth();
  const canEdit = hasRole("inventaris"); // admin read-only, sesuai kebijakan moderasi

  const [view, setView] = useState<"aktif" | "riwayat">("aktif");
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [disposals, setDisposals] = useState<InventoryDisposal[]>([]);

  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingKode, setEditingKode] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [detailRow, setDetailRow] = useState<InventoryItem | null>(null);

  const [disposalItem, setDisposalItem] = useState<InventoryItem | null>(null);
  const [disposalStep, setDisposalStep] = useState<DisposalStep>(null);
  const [disposalForm, setDisposalForm] = useState(emptyDisposalForm);
  const [disposalFoto, setDisposalFoto] = useState<File | null>(null);
  const [disposalSaving, setDisposalSaving] = useState(false);
  const [disposalError, setDisposalError] = useState<string | null>(null);

  const [categoriesLoaded, setCategoriesLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [photoItem, setPhotoItem] = useState<InventoryItem | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const categoryMap = useMemo(() => {
    const m = new Map<string, InventoryCategory>();
    categories.forEach((c) => m.set(c.kode, c));
    return m;
  }, [categories]);

  const load = () => {
    supabase
      .from("inventory_categories")
      .select("*")
      .order("sort_order")
      .then(({ data, error }) => {
        setCategoriesLoaded(true);
        if (error) {
          setLoadError(error.message);
          setCategories([]);
          return;
        }
        setLoadError(null);
        setCategories((data as InventoryCategory[]) ?? []);
      });
    supabase
      .from("inventory_items")
      .select("*")
      .order("kode_barang")
      .then(({ data }) => setItems((data as InventoryItem[]) ?? []));
    supabase
      .from("inventory_disposals")
      .select("*")
      .order("tanggal", { ascending: false })
      .then(({ data }) => setDisposals((data as InventoryDisposal[]) ?? []));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!editingId && categories.length > 0 && !form.kategori_kode) {
      setForm((f) => ({ ...f, kategori_kode: categories[0].kode }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories]);

  const resetForm = () => {
    setForm({ ...emptyForm, kategori_kode: categories[0]?.kode ?? "" });
    setEditingId(null);
    setEditingKode(null);
    setFormError(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!form.kategori_kode) {
      setFormError("Pilih kategori barang.");
      return;
    }
    setSaving(true);

    const payload = {
      nama_barang: form.nama_barang,
      kategori_kode: form.kategori_kode,
      jumlah: Number(form.jumlah) || 0,
      nilai: Number(form.nilai) || 0,
      kondisi: form.kondisi || null,
      lokasi: form.lokasi || null,
      tahun_perolehan: form.tahun_perolehan ? Number(form.tahun_perolehan) : null,
    };

    if (editingId) {
      const { error } = await supabase.from("inventory_items").update(payload).eq("id", editingId);
      if (error) setFormError("Gagal menyimpan perubahan.");
    } else {
      const { data: kodeBarang, error: kodeError } = await supabase.rpc("next_inventory_code", {
        p_kategori_kode: form.kategori_kode,
      });
      if (kodeError || !kodeBarang) {
        setFormError("Gagal membuat Kode Barang. Coba lagi.");
        setSaving(false);
        return;
      }
      const { error } = await supabase.from("inventory_items").insert({
        ...payload,
        kode_barang: kodeBarang,
        created_by: user?.id ?? null,
        created_by_name: profile?.full_name ?? user?.email ?? null,
      });
      if (error) setFormError("Gagal menyimpan barang baru.");
    }

    setSaving(false);
    resetForm();
    load();
  };

  const edit = (item: InventoryItem) => {
    setEditingId(item.id);
    setEditingKode(item.kode_barang);
    setFormError(null);
    setForm({
      kategori_kode: item.kategori_kode,
      nama_barang: item.nama_barang,
      jumlah: String(item.jumlah),
      nilai: String(item.nilai),
      kondisi: item.kondisi ?? "Baik",
      lokasi: item.lokasi ?? "",
      tahun_perolehan: item.tahun_perolehan ? String(item.tahun_perolehan) : "",
    });
  };

  const openPhoto = (item: InventoryItem) => {
    setPhotoItem(item);
    setPhotoFile(null);
    setPhotoError(null);
  };

  const closePhoto = () => {
    setPhotoItem(null);
    setPhotoFile(null);
    setPhotoError(null);
  };

  const handlePhotoFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (file && !file.type.startsWith("image/")) {
      setPhotoError("File harus berupa gambar.");
      return;
    }
    if (file && file.size > 3 * 1024 * 1024) {
      setPhotoError("Ukuran foto maksimal 3MB.");
      return;
    }
    setPhotoError(null);
    setPhotoFile(file);
  };

  const uploadPhoto = async () => {
    if (!photoItem || !photoFile) return;
    setPhotoUploading(true);
    setPhotoError(null);

    const ext = photoFile.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `inventory-items/${photoItem.kode_barang}-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("media")
      .upload(path, photoFile, { cacheControl: "3600", upsert: true });

    if (uploadError) {
      setPhotoUploading(false);
      setPhotoError("Gagal mengunggah foto. Coba lagi.");
      return;
    }

    const fotoUrl = supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
    const { error: updateError } = await supabase
      .from("inventory_items")
      .update({ foto_url: fotoUrl })
      .eq("id", photoItem.id);

    setPhotoUploading(false);
    if (updateError) {
      setPhotoError("Foto terunggah tapi gagal disimpan ke data barang. Coba lagi.");
      return;
    }

    closePhoto();
    load();
  };

  const openDisposal = (item: InventoryItem) => {
    setDisposalItem(item);
    setDisposalStep("choose");
    setDisposalForm({ ...emptyDisposalForm, jumlah: String(item.jumlah) });
    setDisposalFoto(null);
    setDisposalError(null);
  };

  const closeDisposal = () => {
    setDisposalItem(null);
    setDisposalStep(null);
    setDisposalFoto(null);
    setDisposalError(null);
  };

  const handleDisposalFotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (file && !file.type.startsWith("image/")) {
      setDisposalError("File dokumentasi harus berupa gambar.");
      return;
    }
    if (file && file.size > 3 * 1024 * 1024) {
      setDisposalError("Ukuran foto maksimal 3MB.");
      return;
    }
    setDisposalError(null);
    setDisposalFoto(file);
  };

  const submitDisposal = async (tipe: InventoryDisposalTipe) => {
    if (!disposalItem) return;
    setDisposalError(null);

    if (tipe === "hibah" && !disposalForm.hibah_kepada.trim()) {
      setDisposalError("Isi Hibah Kepada terlebih dahulu.");
      return;
    }
    if (tipe === "hapus" && !disposalForm.alasan_hapus.trim()) {
      setDisposalError("Isi Alasan Hapus terlebih dahulu.");
      return;
    }

    const jumlahDisposal = Number(disposalForm.jumlah);
    if (!Number.isInteger(jumlahDisposal) || jumlahDisposal < 1) {
      setDisposalError("Jumlah yang dihibahkan/dihapuskan minimal 1.");
      return;
    }
    if (jumlahDisposal > disposalItem.jumlah) {
      setDisposalError(`Jumlah melebihi stok yang ada (${disposalItem.jumlah}).`);
      return;
    }

    setDisposalSaving(true);

    let fotoUrl: string | null = null;
    if (disposalFoto) {
      const ext = disposalFoto.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `inventory-disposals/${disposalItem.kode_barang}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("media")
        .upload(path, disposalFoto, { cacheControl: "3600" });
      if (uploadError) {
        setDisposalSaving(false);
        setDisposalError("Gagal mengunggah foto dokumentasi.");
        return;
      }
      fotoUrl = supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
    }

    const { error: insertError } = await supabase.from("inventory_disposals").insert({
      kode_barang: disposalItem.kode_barang,
      nama_barang: disposalItem.nama_barang,
      kategori_kode: disposalItem.kategori_kode,
      jumlah: jumlahDisposal,
      nilai: disposalItem.nilai,
      kondisi: disposalItem.kondisi,
      lokasi: disposalItem.lokasi,
      tahun_perolehan: disposalItem.tahun_perolehan,
      tipe,
      hibah_kepada: tipe === "hibah" ? disposalForm.hibah_kepada : null,
      alasan_hapus: tipe === "hapus" ? disposalForm.alasan_hapus : null,
      tanggal: disposalForm.tanggal,
      keterangan: disposalForm.keterangan || null,
      foto_url: fotoUrl,
      created_by: user?.id ?? null,
      created_by_name: profile?.full_name ?? user?.email ?? null,
    });

    if (insertError) {
      setDisposalSaving(false);
      setDisposalError("Gagal menyimpan riwayat. Barang tidak diubah.");
      return;
    }

    const sisaJumlah = disposalItem.jumlah - jumlahDisposal;
    if (sisaJumlah <= 0) {
      // Seluruh stok dikeluarkan -- barang dihapus dari daftar aktif.
      await supabase.from("inventory_items").delete().eq("id", disposalItem.id);
    } else {
      // Sebagian stok dikeluarkan -- barang tetap aktif dengan jumlah dikurangi.
      await supabase.from("inventory_items").update({ jumlah: sisaJumlah }).eq("id", disposalItem.id);
    }

    setDisposalSaving(false);
    closeDisposal();
    load();
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
        <h1 className="font-serif text-2xl font-bold text-primary-900">Inventaris</h1>
        <div className="flex items-center gap-2">
          {!canEdit && (
            <span className="badge bg-gray-100 text-gray-500">
              {isAdmin ? "Mode lihat saja (admin)" : "Mode lihat saja"}
            </span>
          )}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
            <button
              className={`px-3 py-1.5 ${view === "aktif" ? "bg-primary-700 text-white" : "bg-white text-gray-600"}`}
              onClick={() => setView("aktif")}
            >
              Barang Aktif
            </button>
            <button
              className={`px-3 py-1.5 ${view === "riwayat" ? "bg-primary-700 text-white" : "bg-white text-gray-600"}`}
              onClick={() => setView("riwayat")}
            >
              Riwayat Hibah &amp; Hapus
            </button>
          </div>
        </div>
      </div>

      {categoriesLoaded && categories.length === 0 && (
        <div className="card mb-6 border border-red-200 bg-red-50 text-sm text-red-700">
          <p className="font-medium mb-1">Data kategori inventaris belum tersedia.</p>
          <p>
            Kemungkinan besar migrasi <code className="font-mono">migration_005_inventaris.sql</code> belum
            dijalankan di Supabase SQL Editor (atau sempat gagal di tengah jalan). Jalankan file itu, lalu muat
            ulang halaman ini.
          </p>
          {loadError && <p className="mt-2 font-mono text-xs">Error: {loadError}</p>}
        </div>
      )}

      {view === "aktif" && (
        <>
          {canEdit && (
            <form onSubmit={handleSubmit} className="card grid sm:grid-cols-3 gap-3 mb-6">
              {editingKode && (
                <div className="sm:col-span-3">
                  <label className="label">Kode Barang</label>
                  <input className="input bg-gray-50" value={editingKode} disabled />
                </div>
              )}
              <div>
                <label className="label">Kategori</label>
                <select
                  className="input"
                  value={form.kategori_kode}
                  onChange={(e) => setForm({ ...form, kategori_kode: e.target.value })}
                >
                  {categories.map((c) => (
                    <option key={c.kode} value={c.kode}>
                      {c.kode} - {c.nama}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="label">Nama Barang</label>
                <input
                  required
                  className="input"
                  value={form.nama_barang}
                  onChange={(e) => setForm({ ...form, nama_barang: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Jumlah</label>
                <input
                  type="number"
                  min={0}
                  className="input"
                  value={form.jumlah}
                  onChange={(e) => setForm({ ...form, jumlah: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Nilai (Rp)</label>
                <input
                  type="number"
                  min={0}
                  className="input"
                  value={form.nilai}
                  onChange={(e) => setForm({ ...form, nilai: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Kondisi</label>
                <select className="input" value={form.kondisi} onChange={(e) => setForm({ ...form, kondisi: e.target.value })}>
                  {KONDISI_OPTIONS.map((k) => (
                    <option key={k}>{k}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Lokasi</label>
                <input className="input" value={form.lokasi} onChange={(e) => setForm({ ...form, lokasi: e.target.value })} />
              </div>
              <div>
                <label className="label">Tahun Perolehan</label>
                <input
                  type="number"
                  min={1900}
                  max={2100}
                  className="input"
                  value={form.tahun_perolehan}
                  onChange={(e) => setForm({ ...form, tahun_perolehan: e.target.value })}
                />
              </div>
              {formError && <p className="sm:col-span-3 text-sm text-red-600">{formError}</p>}
              <div className="sm:col-span-3 flex gap-2">
                <button className="btn-primary" disabled={saving}>
                  {saving ? "Menyimpan..." : editingId ? "Simpan Perubahan" : "Tambah Barang"}
                </button>
                {editingId && (
                  <button type="button" className="btn-secondary" onClick={resetForm}>
                    Batal
                  </button>
                )}
              </div>
            </form>
          )}

          <div className="card overflow-x-auto !p-0">
            <table className="w-full text-sm min-w-[900px]">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="py-2 pl-4 pr-3">Kode Barang</th>
                  <th className="py-2 pr-3">Nama Barang</th>
                  <th className="py-2 pr-3">Kategori</th>
                  <th className="py-2 pr-3 text-right">Jumlah</th>
                  <th className="py-2 pr-3 text-right">Nilai</th>
                  <th className="py-2 pr-3">Kondisi</th>
                  <th className="py-2 pr-3">Lokasi</th>
                  <th className="py-2 pr-3">Th. Perolehan</th>
                  <th className="py-2 pr-3">User</th>
                  <th className="py-2 pr-4 pl-2"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.id} className="border-b last:border-0 align-top">
                    <td className="py-2 pl-4 pr-3 font-mono text-xs text-gray-600 whitespace-nowrap">{it.kode_barang}</td>
                    <td className="py-2 pr-3 max-w-[200px] truncate" title={it.nama_barang}>
                      {it.nama_barang}
                    </td>
                    <td className="py-2 pr-3 whitespace-nowrap">{categoryMap.get(it.kategori_kode)?.nama ?? it.kategori_kode}</td>
                    <td className="py-2 pr-3 text-right">{it.jumlah}</td>
                    <td className="py-2 pr-3 text-right whitespace-nowrap">{formatRupiah(it.nilai)}</td>
                    <td className="py-2 pr-3 whitespace-nowrap">{it.kondisi}</td>
                    <td className="py-2 pr-3 max-w-[140px] truncate" title={it.lokasi ?? ""}>
                      {it.lokasi}
                    </td>
                    <td className="py-2 pr-3">{it.tahun_perolehan ?? "-"}</td>
                    <td className="py-2 pr-3 max-w-[120px] truncate" title={it.created_by_name ?? ""}>
                      {it.created_by_name ?? "-"}
                    </td>
                    <td className="py-2 pr-4 pl-2">
                      <div className="flex items-center gap-2 text-gray-500">
                        <button className="hover:text-primary-700" title="Detil" onClick={() => setDetailRow(it)}>
                          <DetailIcon />
                        </button>
                        {canEdit && (
                          <>
                            <button
                              className={it.foto_url ? "text-primary-600 hover:text-primary-800" : "hover:text-primary-700"}
                              title={it.foto_url ? "Ganti Foto Barang" : "Upload Foto Barang"}
                              onClick={() => openPhoto(it)}
                            >
                              <CameraIcon />
                            </button>
                            <button className="hover:text-primary-700" title="Ubah" onClick={() => edit(it)}>
                              <EditIcon />
                            </button>
                            <button className="hover:text-red-600" title="Hapus" onClick={() => openDisposal(it)}>
                              <TrashIcon />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {items.length === 0 && <p className="text-sm text-gray-400 py-4 px-4">Belum ada data inventaris.</p>}
          </div>
        </>
      )}

      {view === "riwayat" && (
        <div className="card overflow-x-auto !p-0">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="py-2 pl-4 pr-3">Kode Barang</th>
                <th className="py-2 pr-3">Nama Barang</th>
                <th className="py-2 pr-3">Kategori</th>
                <th className="py-2 pr-3">Tipe</th>
                <th className="py-2 pr-3">Tanggal</th>
                <th className="py-2 pr-3">Kepada / Alasan</th>
                <th className="py-2 pr-3">Keterangan</th>
                <th className="py-2 pr-3">Foto</th>
                <th className="py-2 pr-4">Dicatat Oleh</th>
              </tr>
            </thead>
            <tbody>
              {disposals.map((d) => (
                <tr key={d.id} className="border-b last:border-0 align-top">
                  <td className="py-2 pl-4 pr-3 font-mono text-xs text-gray-600 whitespace-nowrap">{d.kode_barang}</td>
                  <td className="py-2 pr-3 max-w-[180px] truncate" title={d.nama_barang}>
                    {d.nama_barang}
                  </td>
                  <td className="py-2 pr-3 whitespace-nowrap">{categoryMap.get(d.kategori_kode)?.nama ?? d.kategori_kode}</td>
                  <td className="py-2 pr-3">
                    <span
                      className={`badge ${d.tipe === "hibah" ? "bg-gold-500/20 text-gold-600" : "bg-red-100 text-red-700"}`}
                    >
                      {d.tipe === "hibah" ? "Hibah" : "Hapus"}
                    </span>
                  </td>
                  <td className="py-2 pr-3 whitespace-nowrap">{formatTanggal(d.tanggal)}</td>
                  <td className="py-2 pr-3 max-w-[160px] truncate" title={(d.tipe === "hibah" ? d.hibah_kepada : d.alasan_hapus) ?? ""}>
                    {d.tipe === "hibah" ? d.hibah_kepada : d.alasan_hapus}
                  </td>
                  <td className="py-2 pr-3 max-w-[180px] truncate" title={d.keterangan ?? ""}>
                    {d.keterangan ?? "-"}
                  </td>
                  <td className="py-2 pr-3">
                    {d.foto_url ? (
                      <a href={d.foto_url} target="_blank" rel="noreferrer" className="text-primary-700 hover:underline">
                        Lihat Foto
                      </a>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="py-2 pr-4 max-w-[120px] truncate" title={d.created_by_name ?? ""}>
                    {d.created_by_name ?? "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {disposals.length === 0 && (
            <p className="text-sm text-gray-400 py-4 px-4">Belum ada riwayat hibah/penghapusan barang.</p>
          )}
        </div>
      )}

      {/* Modal Detail */}
      {detailRow && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setDetailRow(null)}>
          <div className="card max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-serif text-lg font-bold text-primary-900 mb-4">Detil Barang</h3>
            {detailRow.foto_url && (
              <img
                src={detailRow.foto_url}
                alt={detailRow.nama_barang}
                className="w-full max-h-56 object-cover rounded-lg border border-gray-200 mb-4"
              />
            )}
            <dl className="space-y-2 text-sm">
              {(
                [
                  ["Kode Barang", detailRow.kode_barang],
                  ["Nama Barang", detailRow.nama_barang],
                  ["Kategori", categoryMap.get(detailRow.kategori_kode)?.nama ?? detailRow.kategori_kode],
                  ["Jumlah", String(detailRow.jumlah)],
                  ["Nilai", formatRupiah(detailRow.nilai)],
                  ["Kondisi", detailRow.kondisi ?? "-"],
                  ["Lokasi", detailRow.lokasi ?? "-"],
                  ["Tahun Perolehan", detailRow.tahun_perolehan ? String(detailRow.tahun_perolehan) : "-"],
                  ["Dicatat oleh", detailRow.created_by_name ?? "-"],
                  ["Dicatat pada", formatTanggal(detailRow.created_at)],
                ] as [string, string][]
              ).map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 border-b border-gray-100 pb-2 last:border-0">
                  <dt className="text-gray-500">{label}</dt>
                  <dd className="font-medium text-gray-800 text-right">{value}</dd>
                </div>
              ))}
            </dl>
            <button className="btn-secondary w-full mt-4" onClick={() => setDetailRow(null)}>
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* Modal upload foto barang */}
      {photoItem && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={closePhoto}>
          <div className="card max-w-sm w-full space-y-3" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-serif text-lg font-bold text-primary-900">Foto Barang</h3>
            <p className="text-sm text-gray-500">
              {photoItem.nama_barang} ({photoItem.kode_barang})
            </p>
            <img
              src={photoFile ? URL.createObjectURL(photoFile) : photoItem.foto_url ?? undefined}
              alt=""
              className={`w-full max-h-48 object-cover rounded-lg border border-gray-200 ${
                photoFile || photoItem.foto_url ? "" : "hidden"
              }`}
            />
            <input type="file" accept="image/*" capture="environment" className="input" onChange={handlePhotoFileChange} />
            {photoError && <p className="text-sm text-red-600">{photoError}</p>}
            <div className="flex gap-2 pt-1">
              <button className="btn-primary flex-1" disabled={!photoFile || photoUploading} onClick={uploadPhoto}>
                {photoUploading ? "Mengunggah..." : "Simpan Foto"}
              </button>
              <button className="btn-secondary" onClick={closePhoto}>
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal pilih jenis penghapusan */}
      {disposalItem && disposalStep === "choose" && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={closeDisposal}>
          <div className="card max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-serif text-lg font-bold text-primary-900 mb-1">Keluarkan Barang</h3>
            <p className="text-sm text-gray-500 mb-4">
              <span className="font-medium text-gray-700">{disposalItem.nama_barang}</span> ({disposalItem.kode_barang},
              stok {disposalItem.jumlah}). Kamu bisa memilih sebagian atau seluruh stok pada langkah berikutnya. Pilih
              jenis penghapusan:
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button className="btn-gold" onClick={() => setDisposalStep("hibah")}>
                Hibah
              </button>
              <button className="btn-danger" onClick={() => setDisposalStep("hapus")}>
                Hapus
              </button>
            </div>
            <button className="btn-secondary w-full mt-3" onClick={closeDisposal}>
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Modal form Hibah */}
      {disposalItem && disposalStep === "hibah" && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={closeDisposal}>
          <div className="card max-w-md w-full space-y-3" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-serif text-lg font-bold text-primary-900">Hibah Barang</h3>
            <p className="text-sm text-gray-500">
              {disposalItem.nama_barang} ({disposalItem.kode_barang})
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Jumlah Stok</label>
                <input className="input bg-gray-50" value={disposalItem.jumlah} disabled />
              </div>
              <div>
                <label className="label">Jumlah Dihibahkan</label>
                <input
                  type="number"
                  min={1}
                  max={disposalItem.jumlah}
                  className="input"
                  value={disposalForm.jumlah}
                  onChange={(e) => setDisposalForm({ ...disposalForm, jumlah: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="label">Hibah Kepada</label>
              <input
                className="input"
                value={disposalForm.hibah_kepada}
                onChange={(e) => setDisposalForm({ ...disposalForm, hibah_kepada: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Tanggal</label>
              <input
                type="date"
                className="input"
                value={disposalForm.tanggal}
                onChange={(e) => setDisposalForm({ ...disposalForm, tanggal: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Keterangan</label>
              <textarea
                className="input"
                rows={2}
                value={disposalForm.keterangan}
                onChange={(e) => setDisposalForm({ ...disposalForm, keterangan: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Upload Foto Dokumentasi</label>
              <input type="file" accept="image/*" capture="environment" className="input" onChange={handleDisposalFotoChange} />
            </div>
            {disposalError && <p className="text-sm text-red-600">{disposalError}</p>}
            <div className="flex gap-2 pt-1">
              <button className="btn-gold flex-1" disabled={disposalSaving} onClick={() => submitDisposal("hibah")}>
                {disposalSaving ? "Menyimpan..." : "Simpan Hibah"}
              </button>
              <button className="btn-secondary" onClick={() => setDisposalStep("choose")}>
                Kembali
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal form Hapus */}
      {disposalItem && disposalStep === "hapus" && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={closeDisposal}>
          <div className="card max-w-md w-full space-y-3" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-serif text-lg font-bold text-primary-900">Hapus Barang</h3>
            <p className="text-sm text-gray-500">
              {disposalItem.nama_barang} ({disposalItem.kode_barang})
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Jumlah Stok</label>
                <input className="input bg-gray-50" value={disposalItem.jumlah} disabled />
              </div>
              <div>
                <label className="label">Jumlah Dihapuskan</label>
                <input
                  type="number"
                  min={1}
                  max={disposalItem.jumlah}
                  className="input"
                  value={disposalForm.jumlah}
                  onChange={(e) => setDisposalForm({ ...disposalForm, jumlah: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="label">Alasan Hapus</label>
              <textarea
                className="input"
                rows={2}
                value={disposalForm.alasan_hapus}
                onChange={(e) => setDisposalForm({ ...disposalForm, alasan_hapus: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Tanggal</label>
              <input
                type="date"
                className="input"
                value={disposalForm.tanggal}
                onChange={(e) => setDisposalForm({ ...disposalForm, tanggal: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Upload Foto Dokumentasi</label>
              <input type="file" accept="image/*" capture="environment" className="input" onChange={handleDisposalFotoChange} />
            </div>
            {disposalError && <p className="text-sm text-red-600">{disposalError}</p>}
            <div className="flex gap-2 pt-1">
              <button className="btn-danger flex-1" disabled={disposalSaving} onClick={() => submitDisposal("hapus")}>
                {disposalSaving ? "Menyimpan..." : "Simpan Penghapusan"}
              </button>
              <button className="btn-secondary" onClick={() => setDisposalStep("choose")}>
                Kembali
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
