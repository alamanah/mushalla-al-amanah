import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

// Halaman ini menjadi tujuan link konfirmasi email dari Supabase Auth.
// Supabase client (detectSessionInUrl: true) otomatis memproses token di URL.
export default function AuthCallback() {
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setStatus(data.session ? "ok" : "error");
    });
  }, []);

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="card text-center">
        {status === "loading" && <p className="text-sm text-gray-500">Memverifikasi email...</p>}
        {status === "ok" && (
          <>
            <h1 className="font-serif text-2xl font-bold text-primary-900 mb-2">Email Terkonfirmasi 🎉</h1>
            <p className="text-sm text-gray-600 mb-4">
              Akun kamu sudah aktif dan sekarang menunggu verifikasi oleh admin mushalla.
            </p>
            <Link to="/" className="btn-primary">
              Ke Beranda
            </Link>
          </>
        )}
        {status === "error" && (
          <>
            <h1 className="font-serif text-2xl font-bold text-primary-900 mb-2">Link Tidak Valid</h1>
            <p className="text-sm text-gray-600 mb-4">
              Link konfirmasi tidak valid atau sudah kedaluwarsa. Silakan coba masuk atau daftar ulang.
            </p>
            <Link to="/login" className="btn-primary">
              Ke Halaman Masuk
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
