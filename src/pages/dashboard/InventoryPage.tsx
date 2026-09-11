import { FormEvent, useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import { InventoryItem } from "../../types";

const emptyForm = {
  nama_barang: "",
  kategori: "",
  jumlah: "1",
  kondisi: "Baik",
  lokasi: "",
  tanggal_perolehan: "",
  catatan: "",
};

export default function InventoryPage() {
  const { user, isAdmin, hasRole } = useAuth();
  const canEdit = hasRole("inventaris"); // admin read-only, sesuai kebijakan moderasi
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = () => {
    supabase
      .from("inventory_items")
      .select("*")
      .order("updated_at", { ascending: false })
      .then(({ data }) => setItems((data as InventoryItem[]) ?? []));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      nama_barang: form.nama_barang,
      kategori: form.kategori || null,
      jumlah: Number(form.jumlah) || 0,
      kondisi: form.kondisi || null,
      lokasi: form.lokasi || null,
      tanggal_perolehan: form.tanggal_perolehan || null,
      catatan: form.catatan || null,
    };
    if (editingId) {
      await supabase.from("inventory_items").update(payload).eq("id", editingId);
    } else {
      await supabase.from("inventory_items").insert({ ...payload, created_by: user?.id ?? null });
    }
    setSaving(false);
    resetForm();
    load();
  };

  const edit = (item: InventoryItem) => {
    setEditingId(item.id);
    setForm({
      nama_barang: item.nama_barang,
      kategori: item.kategori ?? "",
      jumlah: String(item.jumlah),
      kondisi: item.kondisi ?? "",
      lokasi: item.lokasi ?? "",
      tanggal_perolehan: item.tanggal_perolehan ?? "",
      catatan: item.catatan ?? "",
    });
  };

  const remove = async (id: string) => {
    await supabase.from("inventory_items").delete().eq("id", id);
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-2xl font-bold text-primary-900">Inventaris</h1>
        {!canEdit && (
          <span className="badge bg-gray-100 text-gray-500">{isAdmin ? "Mode lihat saja (admin)" : "Mode lihat saja"}</span>
        )}
      </div>

      {canEdit && (
      <form onSubmit={handleSubmit} className="card grid sm:grid-cols-3 gap-3 mb-6">
        <div>
          <label className="label">Nama Barang</label>
          <input
            required
            className="input"
            value={form.nama_barang}
            onChange={(e) => setForm({ ...form, nama_barang: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Kategori</label>
          <input className="input" value={form.kategori} onChange={(e) => setForm({ ...form, kategori: e.target.value })} />
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
          <label className="label">Kondisi</label>
          <select className="input" value={form.kondisi} onChange={(e) => setForm({ ...form, kondisi: e.target.value })}>
            <option>Baik</option>
            <option>Rusak Ringan</option>
            <option>Rusak Berat</option>
          </select>
        </div>
        <div>
          <label className="label">Lokasi</label>
          <input className="input" value={form.lokasi} onChange={(e) => setForm({ ...form, lokasi: e.target.value })} />
        </div>
        <div>
          <label className="label">Tanggal Perolehan</label>
          <input
            type="date"
            className="input"
            value={form.tanggal_perolehan}
            onChange={(e) => setForm({ ...form, tanggal_perolehan: e.target.value })}
          />
        </div>
        <div className="sm:col-span-3">
          <label className="label">Catatan</label>
          <input className="input" value={form.catatan} onChange={(e) => setForm({ ...form, catatan: e.target.value })} />
        </div>
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

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b">
              <th className="py-2 pr-4">Nama Barang</th>
              <th className="py-2 pr-4">Kategori</th>
              <th className="py-2 pr-4">Jumlah</th>
              <th className="py-2 pr-4">Kondisi</th>
              <th className="py-2 pr-4">Lokasi</th>
              {canEdit && <th className="py-2 pr-4"></th>}
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className="border-b last:border-0">
                <td className="py-2 pr-4">{it.nama_barang}</td>
                <td className="py-2 pr-4">{it.kategori}</td>
                <td className="py-2 pr-4">{it.jumlah}</td>
                <td className="py-2 pr-4">{it.kondisi}</td>
                <td className="py-2 pr-4">{it.lokasi}</td>
                {canEdit && (
                  <td className="py-2 pr-4 flex gap-2">
                    <button className="text-primary-700 text-xs" onClick={() => edit(it)}>
                      Ubah
                    </button>
                    <button className="text-red-500 text-xs" onClick={() => remove(it.id)}>
                      Hapus
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && <p className="text-sm text-gray-400 py-4">Belum ada data inventaris.</p>}
      </div>
    </div>
  );
}
