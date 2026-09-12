import { FormEvent, useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { AppRole, Profile, ROLE_LABEL, Ustadz } from "../../types";

// Role yang bisa ditambahkan lewat halaman Referensi (tidak termasuk admin --
// pemberian akses admin tetap lewat menu Verifikasi User agar tidak longgar).
const ASSIGNABLE_ROLES: AppRole[] = ["humas", "bendahara", "inventaris"];

const emptyUstadzForm = { nama: "", kontak: "", bidang: "", keterangan: "" };

function TabUser() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [rolesByUser, setRolesByUser] = useState<Record<string, AppRole[]>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("*")
      .eq("status", "approved")
      .order("full_name", { ascending: true });
    setUsers((profiles as Profile[]) ?? []);

    const { data: roleRows } = await supabase.from("user_roles").select("user_id, role");
    const map: Record<string, AppRole[]> = {};
    (roleRows ?? []).forEach((r: { user_id: string; role: AppRole }) => {
      map[r.user_id] = [...(map[r.user_id] ?? []), r.role];
    });
    setRolesByUser(map);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const toggleRole = async (userId: string, role: AppRole, active: boolean) => {
    if (active) {
      await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role);
    } else {
      await supabase.from("user_roles").insert({ user_id: userId, role });
    }
    load();
  };

  const q = search.trim().toLowerCase();
  const usersTampil = q
    ? users.filter((u) => (u.full_name ?? "").toLowerCase().includes(q) || (u.email ?? "").toLowerCase().includes(q))
    : users;

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">
        Daftar user yang sudah terverifikasi. Klik peran untuk menambah/mencabutnya dari user
        tersebut. Untuk memberi akses admin atau approve/tolak/hapus user, gunakan menu
        <span className="font-medium"> Verifikasi User</span>.
      </p>
      <input
        className="input max-w-xs mb-4"
        placeholder="Cari nama atau email..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {loading && <p className="text-sm text-gray-400">Memuat...</p>}
      {!loading && users.length === 0 && <p className="text-sm text-gray-400">Belum ada user terverifikasi.</p>}
      {!loading && users.length > 0 && usersTampil.length === 0 && (
        <p className="text-sm text-gray-400">Tidak ditemukan user dengan nama/email tersebut.</p>
      )}
      <div className="space-y-3">
        {usersTampil.map((u) => {
          const roles = rolesByUser[u.id] ?? [];
          return (
            <div key={u.id} className="card">
              <div>
                <p className="font-medium text-gray-800">{u.full_name || "(Tanpa nama)"}</p>
                <p className="text-xs text-gray-500">{u.email}</p>
                <p className="text-xs text-gray-400">{u.phone}</p>
              </div>
              <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t items-center">
                <span className="text-xs text-gray-400 mr-1">Peran:</span>
                {ASSIGNABLE_ROLES.map((r) => {
                  const active = roles.includes(r);
                  return (
                    <button
                      key={r}
                      onClick={() => toggleRole(u.id, r, active)}
                      className={`badge border ${
                        active
                          ? "bg-gold-500/20 text-gold-700 border-gold-400"
                          : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      {ROLE_LABEL[r]}
                    </button>
                  );
                })}
                {roles.includes("admin") && (
                  <span className="badge bg-primary-100 text-primary-700">Admin</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TabUstadz() {
  const [items, setItems] = useState<Ustadz[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyUstadzForm);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const load = () => {
    setLoading(true);
    supabase
      .from("ustadz")
      .select("*")
      .order("nama", { ascending: true })
      .then(({ data }) => {
        setItems((data as Ustadz[]) ?? []);
        setLoading(false);
      });
  };

  useEffect(() => {
    load();
  }, []);

  const startAdd = () => {
    setEditingId(null);
    setForm(emptyUstadzForm);
    setShowForm(true);
  };

  const startEdit = (u: Ustadz) => {
    setEditingId(u.id);
    setForm({ nama: u.nama, kontak: u.kontak ?? "", bidang: u.bidang ?? "", keterangan: u.keterangan ?? "" });
    setShowForm(true);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyUstadzForm);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      nama: form.nama,
      kontak: form.kontak || null,
      bidang: form.bidang || null,
      keterangan: form.keterangan || null,
    };
    const { error } = editingId
      ? await supabase.from("ustadz").update(payload).eq("id", editingId)
      : await supabase.from("ustadz").insert(payload);
    setSaving(false);
    if (error) {
      alert("Gagal menyimpan: " + error.message);
      return;
    }
    cancelForm();
    load();
  };

  const remove = async (u: Ustadz) => {
    if (!confirm(`Hapus data ustadz "${u.nama}"?`)) return;
    await supabase.from("ustadz").delete().eq("id", u.id);
    load();
  };

  const itemsTampil = items.filter((u) => u.nama.toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">Daftar ustadz/penceramah untuk rujukan internal pengurus.</p>
        <button className="btn-primary !py-1.5 !px-3 text-sm" onClick={startAdd}>
          + Tambah Ustadz
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="card mb-6 grid sm:grid-cols-2 gap-3">
          <h2 className="sm:col-span-2 font-semibold text-gray-800">
            {editingId ? "Sunting Data Ustadz" : "Tambah Ustadz"}
          </h2>
          <div>
            <label className="label">Nama</label>
            <input
              className="input"
              required
              value={form.nama}
              onChange={(e) => setForm({ ...form, nama: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Kontak (HP/WA)</label>
            <input
              className="input"
              value={form.kontak}
              onChange={(e) => setForm({ ...form, kontak: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Bidang/Spesialisasi</label>
            <input
              className="input"
              value={form.bidang}
              onChange={(e) => setForm({ ...form, bidang: e.target.value })}
              placeholder="mis. Fiqih, Tahsin, dst."
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Keterangan</label>
            <textarea
              className="input"
              rows={2}
              value={form.keterangan}
              onChange={(e) => setForm({ ...form, keterangan: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2 flex gap-2">
            <button className="btn-primary" disabled={saving}>
              {saving ? "Menyimpan..." : "Simpan"}
            </button>
            <button type="button" className="btn-secondary" onClick={cancelForm}>
              Batal
            </button>
          </div>
        </form>
      )}

      <input
        className="input max-w-xs mb-4"
        placeholder="Cari nama ustadz..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {loading && <p className="text-sm text-gray-400">Memuat...</p>}
      {!loading && items.length === 0 && <p className="text-sm text-gray-400">Belum ada data ustadz.</p>}
      {!loading && items.length > 0 && itemsTampil.length === 0 && (
        <p className="text-sm text-gray-400">Tidak ditemukan ustadz dengan nama tersebut.</p>
      )}

      <div className="space-y-3">
        {itemsTampil.map((u) => (
          <div key={u.id} className="card flex items-start justify-between gap-3">
            <div>
              <p className="font-medium text-gray-800">{u.nama}</p>
              {u.bidang && <p className="text-xs text-gold-600">{u.bidang}</p>}
              {u.kontak && <p className="text-xs text-gray-500">{u.kontak}</p>}
              {u.keterangan && <p className="text-xs text-gray-400 mt-1">{u.keterangan}</p>}
            </div>
            <div className="flex gap-2 shrink-0 text-xs">
              <button className="text-primary-700" onClick={() => startEdit(u)}>
                Sunting
              </button>
              <button className="text-red-500" onClick={() => remove(u)}>
                Hapus
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Referensi() {
  const [tab, setTab] = useState<"user" | "ustadz">("user");

  return (
    <div>
      <h1 className="font-serif text-2xl font-bold text-primary-900 mb-4">Referensi</h1>
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab("user")}
          className={`badge border ${
            tab === "user" ? "bg-primary-700 text-white border-primary-700" : "bg-white text-gray-500 border-gray-200"
          }`}
        >
          User
        </button>
        <button
          onClick={() => setTab("ustadz")}
          className={`badge border ${
            tab === "ustadz" ? "bg-primary-700 text-white border-primary-700" : "bg-white text-gray-500 border-gray-200"
          }`}
        >
          Ustadz
        </button>
      </div>
      {tab === "user" ? <TabUser /> : <TabUstadz />}
    </div>
  );
}
