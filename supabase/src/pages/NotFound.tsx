import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="max-w-md mx-auto px-4 py-24 text-center">
      <h1 className="font-serif text-4xl font-bold text-primary-900 mb-3">404</h1>
      <p className="text-gray-500 mb-6">Halaman tidak ditemukan.</p>
      <Link to="/" className="btn-primary">
        Kembali ke Beranda
      </Link>
    </div>
  );
}
