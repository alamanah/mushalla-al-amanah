import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      setError(
        error.message.includes("Email not confirmed")
          ? "Email belum dikonfirmasi. Silakan cek inbox/spam email kamu untuk link konfirmasi."
          : "Email atau password salah."
      );
      return;
    }
    // Yang punya akses Dashboard (admin/bendahara/inventaris/humas) langsung
    // diarahkan ke Dashboard; jamaah biasa (tanpa role) tetap ke beranda.
    let hasDashboardRole = false;
    if (data.user) {
      const { data: roleRows } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id);
      hasDashboardRole = (roleRows ?? []).length > 0;
    }
    setLoading(false);
    navigate(hasDashboardRole ? "/dashboard" : "/");
  };

  const openForgotPassword = () => {
    setError(null);
    setResetError(null);
    setResetSent(false);
    setMode("forgot");
  };

  const handleForgotPassword = async (e: FormEvent) => {
    e.preventDefault();
    setResetError(null);
    if (!email) {
      setResetError("Masukkan email kamu terlebih dahulu.");
      return;
    }
    setResetLoading(true);
    const redirectTo = `${window.location.origin}${import.meta.env.BASE_URL}reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    setResetLoading(false);
    if (error) {
      setResetError("Gagal mengirim email reset password. Coba lagi beberapa saat lagi.");
      return;
    }
    setResetSent(true);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="card">
        {mode === "login" ? (
          <>
            <h1 className="font-serif text-2xl font-bold text-primary-900 mb-1">Masuk</h1>
            <p className="text-sm text-gray-500 mb-6">Masuk ke akun jamaah Mushalla Al Amanah.</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  required
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Password</label>
                <input
                  type="password"
                  required
                  className="input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="text-right -mt-2">
                <button
                  type="button"
                  onClick={openForgotPassword}
                  className="text-xs text-primary-700 hover:underline"
                >
                  Lupa password?
                </button>
              </div>
              <button className="btn-primary w-full" disabled={loading}>
                {loading ? "Memproses..." : "Masuk"}
              </button>
            </form>
            <p className="text-sm text-gray-500 mt-4 text-center">
              Belum punya akun?{" "}
              <Link to="/register" className="text-primary-700 font-medium">
                Daftar di sini
              </Link>
            </p>
          </>
        ) : (
          <>
            <h1 className="font-serif text-2xl font-bold text-primary-900 mb-1">Reset Password</h1>
            <p className="text-sm text-gray-500 mb-6">
              Masukkan email akun kamu, kami akan kirim link untuk membuat password baru.
            </p>
            {resetSent ? (
              <div className="text-center py-2">
                <p className="text-sm text-primary-700 mb-4">
                  Link reset password sudah dikirim ke <span className="font-medium">{email}</span>. Cek
                  inbox/spam email kamu.
                </p>
                <button className="btn-secondary" onClick={() => setMode("login")}>
                  Kembali ke Halaman Masuk
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label className="label">Email</label>
                  <input
                    type="email"
                    required
                    className="input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                {resetError && <p className="text-sm text-red-600">{resetError}</p>}
                <button className="btn-primary w-full" disabled={resetLoading}>
                  {resetLoading ? "Mengirim..." : "Kirim Link Reset Password"}
                </button>
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className="text-sm text-gray-500 hover:underline w-full text-center block"
                >
                  ← Kembali ke Masuk
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
