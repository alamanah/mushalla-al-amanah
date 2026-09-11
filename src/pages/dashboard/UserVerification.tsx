import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import { AppRole, Profile, ROLE_LABEL } from "../../types";

const ALL_ROLES: AppRole[] = ["admin", "bendahara", "inventaris", "humas"];

export default function UserVerification() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [rolesByUser, setRolesByUser] = useState<Record<string, AppRole[]>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "approved" | "all">("pending");

  const load = async () => {
    setLoading(true);
    let query = supabase.from("profiles").select("*").order("created_at", { ascending: false });
    if (filter !== "all") query = query.eq("status", filter);
    const { data: profiles } = await query;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const setStatus = async (id: string, status: "approved" | "rejected") => {
    await supabase.from("profiles").update({ status }).eq("id", id);
    load();
  };

  const toggleRole = async (userId: string, role: AppRole, active: boolean) => {
    if (active) {
      await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role);
    } else {
      await supabase.from("user_roles").insert({ user_id: userId, role });
    }
    load();
  };

  const deleteUser = async (u: Profile) => {
    if (u.id === currentUser?.id) {
      alert("Tidak bisa menghapus akun sendiri.");
      return;
    }
    if (
      !confirm(
        `Hapus profil "${u.full_name || u.email}"? Ini menghapus datanya dari aplikasi (role, artikel jadi tanpa penulis), tapi akun login Supabase-nya tidak otomatis terhapus.`
      )
    )
      return;
    const { error } = await supabase.from("profiles").delete().eq("id", u.id);
    if (error) {
      alert("Gagal menghapus: " + error.message);
      return;
    }
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-2xl font-bold text-primary-900">Verifikasi User</h1>
        <select className="input max-w-[160px]" value={filter} onChange={(e) => setFilter(e.target.value as any)}>
          <option value="pending">Menunggu</option>
          <option value="approved">Terverifikasi</option>
          <option value="all">Semua</option>
        </select>
      </div>

      {loading && <p className="text-sm text-gray-400">Memuat...</p>}
      {!loading && users.length === 0 && <p className="text-sm text-gray-400">Tidak ada user.</p>}

      <div className="space-y-3">
        {users.map((u) => {
          const roles = rolesByUser[u.id] ?? [];
          return (
            <div key={u.id} className="card">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-gray-800">{u.full_name || "(Tanpa nama)"}</p>
                  <p className="text-xs text-gray-500">{u.email}</p>
                  <p className="text-xs text-gray-400">{u.phone}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`badge ${
                      u.status === "approved"
                        ? "bg-primary-100 text-primary-700"
                        : u.status === "rejected"
                        ? "bg-red-100 text-red-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {u.status}
                  </span>
                  {u.status !== "approved" && (
                    <button className="btn-primary !py-1 !px-3 text-xs" onClick={() => setStatus(u.id, "approved")}>
                      Setujui
                    </button>
                  )}
                  {u.status !== "rejected" && (
                    <button className="btn-danger !py-1 !px-3 text-xs" onClick={() => setStatus(u.id, "rejected")}>
                      Tolak
                    </button>
                  )}
                  <button
                    className="text-red-500 text-xs hover:underline"
                    onClick={() => deleteUser(u)}
                    title="Hapus profil user ini"
                  >
                    Hapus
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t items-center">
                <span className="text-xs text-gray-400 mr-1">Peran:</span>
                {ALL_ROLES.map((r) => {
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
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
