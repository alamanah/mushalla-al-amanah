import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function Register() {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Password minimal 6 karakter.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}${import.meta.env.BASE_URL}auth/callback`,
        data: { full_name: fullName, phone },
      },
    });
    setLoading(false);

    if (error) {
      setError(
        error.message.includes("already registered")
          ? "Email ini sudah terdaftar. Silakan masuk."
          : "Pendaftaran gagal: " + error.message
      );
      return;
    }
    setDone(true);
  };

  if (done) {
    return (
      <div className="max-w-md mx-auto px-4 py-16">
        <div className="card text-center">
          <h1 className="font-serif text-2xl font-bold text-primary-900 mb-2">Cek Email Kamu</h1>
          <p className="text-sm text-gray-600">
            Kami sudah mengirim link konfirmasi ke <strong>{email}</strong>. Klik link tersebut untuk
            mengaktifkan akun. Setelah email dikonfirmasi, akun kamu akan menunggu verifikasi oleh
            admin sebelum dapat mengakses fitur jamaah sepenuhnya.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="card">
        <h1 className="font-serif text-2xl font-bold text-primary-900 mb-1">Daftar Jamaah</h1>
        <p className="text-sm text-gray-500 mb-6">
          Gunakan email aktif — kami akan mengirim link konfirmasi ke email tersebut.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Nama Lengkap</label>
            <input required className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div>
            <label className="label">No. HP / WhatsApp</label>
            <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="label">Password</label>
            <input
              type="password"
              required
              minLength={6}
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button className="btn-primary w-full" disabled={loading}>
            {loading ? "Memproses..." : "Daftar"}
          </button>
        </form>
        <p className="text-sm text-gray-500 mt-4 text-center">
          Sudah punya akun?{" "}
          <Link to="/login" className="text-primary-700 font-medium">
            Masuk
          </Link>
        </p>
      </div>
    </div>
  );
}
