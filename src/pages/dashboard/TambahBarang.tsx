import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import { InventoryCategory } from "../../types";

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

function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
      <path
        d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2l1-1.6A1 1 0 0 1 9.36 5h5.28a1 1 0 0 1 .86.4L16.5 7h2A1.5 1.5 0 0 1 20 8.5v9A1.5 1.5 0 0 1 18.5 19h-13A1.5 1.5 0 0 1 4 17.5Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="13" r="3.2" />
    </svg>
  );
}

/**
 * Halaman tambah barang inventaris cepat khusus HP (dibuka dari tombol "+"
 * bottom nav). Sama seperti form tambah di Dashboard > Inventaris, tapi satu
 * kolom, dan foto barang langsung diisi di awal (bisa ambil foto langsung
 * dari kamera HP via tombol "Ambil/Pilih Foto") lalu diunggah setelah barang
 * tersimpan & mendapat Kode Barang.
 */
export default function TambahBarang() {
  const { user, profile, hasRole } = useAuth();
  const canEdit = hasRole("inventaris"); // admin read-only, sesuai kebijakan moderasi -- halaman ini khusus input
  const navigate = useNavigate();

  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedInfo, setSavedInfo] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("inventory_categories")
      .select("*")
      .order("sort_order")
      .then(({ data }) => setCategories((data as InventoryCategory[]) ?? []));
  }, []);

  useEffect(() => {
    if (categories.length > 0 && !form.kategori_kode) {
      setForm((f) => ({ ...f, kategori_kode: categories[0].kode }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories]);

  if (!canEdit) {
    return (
      <div className="max-w-lg mx-auto mt-16 card text-center">
        <h2 className="text-lg font-semibold mb-2">Akses ditolak</h2>
        <p className="text-sm text-gray-600">Kamu tidak memiliki hak akses ke halaman ini.</p>
      </div>
    );
  }

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

  const resetForm = () => {
    setForm({ ...emptyForm, kategori_kode: categories[0]?.kode ?? "" });
    setPhotoFile(null);
    setPhotoError(null);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSavedInfo(null);
    if (!form.kategori_kode) {
      setError("Pilih kategori barang.");
      return;
    }
    setSaving(true);

    const { data: kodeBarang, error: kodeError } = await supabase.rpc("next_inventory_code", {
      p_kategori_kode: form.kategori_kode,
    });
    if (kodeError || !kodeBarang) {
      setSaving(false);
      setError("Gagal membuat Kode Barang. Coba lagi.");
      return;
    }

    let fotoUrl: string | null = null;
    if (photoFile) {
      const ext = photoFile.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `inventory-items/${kodeBarang}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("media")
        .upload(path, photoFile, { cacheControl: "3600", upsert: true });
      if (uploadError) {
        setSaving(false);
        setError("Kode Barang " + kodeBarang + " gagal disimpan (gagal unggah foto). Coba lagi.");
        return;
      }
      fotoUrl = supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
    }

    const { error: insertError } = await supabase.from("inventory_items").insert({
      nama_barang: form.nama_barang,
      kategori_kode: form.kategori_kode,
      jumlah: Number(form.jumlah) || 0,
      nilai: Number(form.nilai) || 0,
      kondisi: form.kondisi || null,
      lokasi: form.lokasi || null,
      tahun_perolehan: form.tahun_perolehan ? Number(form.tahun_perolehan) : null,
      kode_barang: kodeBarang,
      foto_url: fotoUrl,
      created_by: user?.id ?? null,
      created_by_name: profile?.full_name ?? user?.email ?? null,
    });

    setSaving(false);
    if (insertError) {
      setError("Gagal menyimpan barang baru.");
      return;
    }

    setSavedInfo(`Barang tersimpan dengan Kode Barang ${kodeBarang}.`);
    resetForm();
  };

  return (
    <div className="max-w-md mx-auto pb-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-serif text-xl font-bold text-primary-900">Tambah Barang</h1>
        <Link to="/dashboard/inventaris" className="text-sm text-primary-700 hover:underline">
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
      {categories.length === 0 && (
        <div className="mb-4 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-700 text-sm px-3 py-2">
          Kategori belum termuat. Pastikan koneksi internet stabil, atau buka Dashboard &gt; Inventaris terlebih
          dahulu.
        </div>
      )}

      <form onSubmit={submit} className="card flex flex-col gap-3">
        <div>
          <label className="label">Foto Barang</label>
          <div className="flex items-center gap-3">
            <div className="h-20 w-20 rounded-lg border border-gray-200 bg-gray-50 overflow-hidden shrink-0 flex items-center justify-center text-gray-300">
              {photoFile ? (
                <img src={URL.createObjectURL(photoFile)} alt="" className="h-full w-full object-cover" />
              ) : (
                <CameraIcon />
              )}
            </div>
            <label className="btn-secondary text-sm cursor-pointer">
              {photoFile ? "Ganti Foto" : "Ambil/Pilih Foto"}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handlePhotoFileChange}
              />
            </label>
          </div>
          {photoError && <p className="text-xs text-red-600 mt-1">{photoError}</p>}
        </div>

        <div>
          <label className="label">Kategori</label>
          <select
            className="input"
            required
            value={form.kategori_kode}
            onChange={(e) => setForm({ ...form, kategori_kode: e.target.value })}
          >
            {categories.map((c) => (
              <option key={c.kode} value={c.kode}>
                {c.nama}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Nama Barang</label>
          <input
            className="input"
            required
            value={form.nama_barang}
            onChange={(e) => setForm({ ...form, nama_barang: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Jumlah</label>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              className="input"
              required
              value={form.jumlah}
              onChange={(e) => setForm({ ...form, jumlah: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Nilai (Rp)</label>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              className="input"
              value={form.nilai}
              onChange={(e) => setForm({ ...form, nilai: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className="label">Kondisi</label>
          <select
            className="input"
            value={form.kondisi}
            onChange={(e) => setForm({ ...form, kondisi: e.target.value })}
          >
            {KONDISI_OPTIONS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Lokasi</label>
          <input
            className="input"
            value={form.lokasi}
            onChange={(e) => setForm({ ...form, lokasi: e.target.value })}
            placeholder="mis. Gudang, Aula"
          />
        </div>

        <div>
          <label className="label">Tahun Perolehan</label>
          <input
            type="number"
            inputMode="numeric"
            className="input"
            value={form.tahun_perolehan}
            onChange={(e) => setForm({ ...form, tahun_perolehan: e.target.value })}
          />
        </div>

        <div className="flex gap-2 pt-1">
          <button className="btn-primary flex-1" disabled={saving || categories.length === 0}>
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
