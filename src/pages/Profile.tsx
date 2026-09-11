import { ChangeEvent, FormEvent, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { ROLE_LABEL } from "../types";

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

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

export default function Profile() {
  const { user, profile, roles, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

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

  const handleAvatarChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    setAvatarError(null);

    if (!file.type.startsWith("image/")) {
      setAvatarError("File harus berupa gambar (JPG/PNG/dsb).");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setAvatarError("Ukuran gambar maksimal 2MB.");
      return;
    }

    setAvatarUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `avatars/${user.id}/avatar-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("media")
      .upload(path, file, { cacheControl: "3600", upsert: true });

    if (uploadError) {
      setAvatarUploading(false);
      setAvatarError("Gagal mengunggah foto. Coba lagi.");
      return;
    }

    const { data } = supabase.storage.from("media").getPublicUrl(path);
    await supabase.from("profiles").update({ avatar_url: data.publicUrl }).eq("id", user.id);
    await refreshProfile();
    setAvatarUploading(false);
  };

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSaved(false);
    if (newPassword.length < 6) {
      setPasswordError("Password minimal 6 karakter.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Konfirmasi password tidak cocok.");
      return;
    }
    setPasswordSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPasswordSaving(false);
    if (error) {
      setPasswordError("Gagal mengubah password. Coba lagi.");
      return;
    }
    setNewPassword("");
    setConfirmPassword("");
    setPasswordSaved(true);
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-12 space-y-6">
      <h1 className="font-serif text-2xl font-bold text-primary-900">Profil Saya</h1>

      <div className="card space-y-4">
        <div className="flex items-center gap-4">
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt=""
              className="h-16 w-16 rounded-full object-cover border border-gray-200 shrink-0"
            />
          ) : (
            <span className="h-16 w-16 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xl font-semibold shrink-0">
              {(profile?.full_name ?? user?.email ?? "?").charAt(0).toUpperCase()}
            </span>
          )}
          <div>
            <label className="btn-secondary text-sm cursor-pointer inline-block">
              {avatarUploading ? "Mengunggah..." : "Ganti Foto Profil"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
                disabled={avatarUploading}
              />
            </label>
            {avatarError && <p className="text-xs text-red-600 mt-1">{avatarError}</p>}
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
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
                <span key={r} className="badge bg-gold-500/20 text-gold-600">
                  {ROLE_LABEL[r]}
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

      <div className="card space-y-4">
        <h2 className="font-serif text-lg font-bold text-primary-900">Ubah Password</h2>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="label">Password Baru</label>
            <input
              type="password"
              className="input"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Konfirmasi Password Baru</label>
            <input
              type="password"
              className="input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          {passwordError && <p className="text-sm text-red-600">{passwordError}</p>}
          <button className="btn-secondary w-full" disabled={passwordSaving}>
            {passwordSaving ? "Menyimpan..." : "Ubah Password"}
          </button>
          {passwordSaved && <p className="text-sm text-primary-700 text-center">Password berhasil diubah.</p>}
        </form>
      </div>
    </div>
  );
}
