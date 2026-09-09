import { FormEvent, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";

const STATUS_LABEL: Record<string, string> = {
  pending: "Menunggu verifikasi admin",
  approved: "Terverifikasi",
  rejected: "Ditolak",
};

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  approved: "bg-primary-100 text-primary-700",
  rejected: "bg-red-100 text-red-700",
};

export default function Profile() {
  const { user, profile, roles, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setSaved(false);
    await supabase.from("profiles").update({ full_name: fullName, phone }).eq("id", user.id);
    await refreshProfile();
    setSaving(false);
    setSaved(true);
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      <h1 className="font-serif text-2xl font-bold text-primary-900 mb-6">Profil Saya</h1>
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">Status Akun</span>
          <span className={`badge ${STATUS_COLOR[profile?.status ?? "pending"]}`}>
            {STATUS_LABEL[profile?.status ?? "pending"]}
          </span>
        </div>
        {roles.length > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Peran</span>
            <div className="flex gap-1">
              {roles.map((r) => (
                <span key={r} className="badge bg-gold-500/20 text-gold-600 capitalize">
                  {r}
                </span>
              ))}
            </div>
          </div>
        )}
        <form onSubmit={handleSave} className="space-y-4 pt-2 border-t">
          <div>
            <label className="label">Email</label>
            <input className="input bg-gray-50" value={user?.email ?? ""} disabled />
          </div>
          <div>
            <label className="label">Nama Lengkap</label>
            <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div>
            <label className="label">No. HP / WhatsApp</label>
            <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <button className="btn-primary w-full" disabled={saving}>
            {saving ? "Menyimpan..." : "Simpan Perubahan"}
          </button>
          {saved && <p className="text-sm text-primary-700 text-center">Profil berhasil diperbarui.</p>}
        </form>
      </div>
    </div>
  );
}
