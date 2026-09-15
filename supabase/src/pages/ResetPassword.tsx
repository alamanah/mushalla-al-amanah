import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

type Status = "checking" | "ready" | "invalid" | "done";

// Halaman tujuan link "reset password" dari email Supabase Auth. Supabase
// client (detectSessionInUrl: true) otomatis memproses token pemulihan di
// URL dan memicu event PASSWORD_RECOVERY -- di sinilah user memasukkan
// password baru.
export default function ResetPassword() {
  const [status, setStatus] = useState<Status>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let resolved = false;

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) {
        resolved = true;
        setStatus("ready");
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        resolved = true;
        setStatus("ready");
      }
    });

    const timeout = setTimeout(() => {
      if (!resolved) setStatus("invalid");
    }, 3000);

    return () => {
      listener.subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Password minimal 6 karakter.");
      return;
    }
    if (password !== confirm) {
      setError("Konfirmasi password tidak cocok.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) {
      setError("Gagal mengubah password. Silakan minta link reset baru.");
      return;
    }
    setStatus("done");
    setTimeout(() => navigate("/login"), 2500);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="card">
        <h1 className="font-serif text-2xl font-bold text-primary-900 mb-1">Atur Ulang Password</h1>

        {status === "checking" && (
          <p className="text-sm text-gray-500 mt-4">Memverifikasi link reset password...</p>
        )}

        {status === "invalid" && (
          <>
            <p className="text-sm text-gray-600 mt-4 mb-4">
              Link reset password tidak valid atau sudah kedaluwarsa. Silakan minta link baru dari halaman
              Masuk.
            </p>
            <Link to="/login" className="btn-primary">
              Ke Halaman Masuk
            </Link>
          </>
        )}

        {status === "ready" && (
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <p className="text-sm text-gray-500">Masukkan password baru untuk akun kamu.</p>
            <div>
              <label className="label">Password Baru</label>
              <input
                type="password"
                required
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Konfirmasi Password Baru</label>
              <input
                type="password"
                required
                className="input"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button className="btn-primary w-full" disabled={saving}>
              {saving ? "Menyimpan..." : "Simpan Password Baru"}
            </button>
          </form>
        )}

        {status === "done" && (
          <div className="text-center py-4">
            <p className="text-sm text-primary-700 mb-4">
              Password berhasil diubah. Mengarahkan ke halaman masuk...
            </p>
            <Link to="/login" className="btn-primary">
              Ke Halaman Masuk
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
