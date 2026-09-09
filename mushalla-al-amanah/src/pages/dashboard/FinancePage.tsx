import { FormEvent, useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import { FinancialTransaction, TransactionType } from "../../types";

function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

const emptyForm = {
  tanggal: new Date().toISOString().slice(0, 10),
  jenis: "masuk" as TransactionType,
  kategori: "",
  deskripsi: "",
  jumlah: "",
};

export default function FinancePage() {
  const { user } = useAuth();
  const [items, setItems] = useState<FinancialTransaction[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = () => {
    supabase
      .from("financial_transactions")
      .select("*")
      .order("tanggal", { ascending: false })
      .then(({ data }) => setItems((data as FinancialTransaction[]) ?? []));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await supabase.from("financial_transactions").insert({
      tanggal: form.tanggal,
      jenis: form.jenis,
      kategori: form.kategori,
      deskripsi: form.deskripsi || null,
      jumlah: Number(form.jumlah),
      created_by: user?.id ?? null,
    });
    setSaving(false);
    setForm(emptyForm);
    load();
  };

  const remove = async (id: string) => {
    await supabase.from("financial_transactions").delete().eq("id", id);
    load();
  };

  return (
    <div>
      <h1 className="font-serif text-2xl font-bold text-primary-900 mb-6">Kelola Keuangan</h1>

      <form onSubmit={handleSubmit} className="card grid sm:grid-cols-5 gap-3 items-end mb-6">
        <div>
          <label className="label">Tanggal</label>
          <input
            type="date"
            required
            className="input"
            value={form.tanggal}
            onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Jenis</label>
          <select
            className="input"
            value={form.jenis}
            onChange={(e) => setForm({ ...form, jenis: e.target.value as TransactionType })}
          >
            <option value="masuk">Pemasukan</option>
            <option value="keluar">Pengeluaran</option>
          </select>
        </div>
        <div>
          <label className="label">Kategori</label>
          <input
            required
            className="input"
            placeholder="Infaq Jumat, Listrik, dll"
            value={form.kategori}
            onChange={(e) => setForm({ ...form, kategori: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Jumlah (Rp)</label>
          <input
            type="number"
            min={0}
            required
            className="input"
            value={form.jumlah}
            onChange={(e) => setForm({ ...form, jumlah: e.target.value })}
          />
        </div>
        <button className="btn-primary" disabled={saving}>
          {saving ? "Menyimpan..." : "Tambah"}
        </button>
        <div className="sm:col-span-5">
          <label className="label">Keterangan (opsional)</label>
          <input className="input" value={form.deskripsi} onChange={(e) => setForm({ ...form, deskripsi: e.target.value })} />
        </div>
      </form>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b">
              <th className="py-2 pr-4">Tanggal</th>
              <th className="py-2 pr-4">Jenis</th>
              <th className="py-2 pr-4">Kategori</th>
              <th className="py-2 pr-4">Keterangan</th>
              <th className="py-2 pr-4 text-right">Jumlah</th>
              <th className="py-2 pr-4"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((t) => (
              <tr key={t.id} className="border-b last:border-0">
                <td className="py-2 pr-4 whitespace-nowrap">{t.tanggal}</td>
                <td className="py-2 pr-4 capitalize">{t.jenis}</td>
                <td className="py-2 pr-4">{t.kategori}</td>
                <td className="py-2 pr-4 text-gray-500">{t.deskripsi}</td>
                <td className={`py-2 pr-4 text-right font-medium ${t.jenis === "masuk" ? "text-primary-700" : "text-red-600"}`}>
                  {formatRupiah(t.jumlah)}
                </td>
                <td className="py-2 pr-4">
                  <button className="text-red-500 text-xs" onClick={() => remove(t.id)}>
                    Hapus
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && <p className="text-sm text-gray-400 py-4">Belum ada transaksi.</p>}
      </div>
    </div>
  );
}
