import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(
        error.message.includes("Email not confirmed")
          ? "Email belum dikonfirmasi. Silakan cek inbox/spam email kamu untuk link konfirmasi."
          : "Email atau password salah."
      );
      return;
    }
    navigate("/");
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="card">
        <h1 className="font-serif text-2xl font-bold text-primary-900 mb-1">Masuk</h1>
        <p className="text-sm text-gray-500 mb-6">Masuk ke akun jamaah Mushalla Al Amanah.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Email</label>
            <input type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
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
      </div>
    </div>
  );
}
