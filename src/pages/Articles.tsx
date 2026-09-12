import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import { Article } from "../types";

const PAGE_SIZE = 10;

export default function Articles() {
  const { user, profile } = useAuth();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    supabase
      .from("articles")
      .select("*")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .then(({ data }) => {
        setArticles((data as Article[]) ?? []);
        setLoading(false);
      });
  }, []);

  const canWrite = !!user && profile?.status === "approved";

  const totalPages = Math.max(1, Math.ceil(articles.length / PAGE_SIZE));
  // Kalau daftar artikel berubah (mis. baru dimuat) dan halaman yang lagi
  // diminta jadi di luar jangkauan, batasi ke halaman terakhir yang valid --
  // dihitung langsung saat render (bukan lewat efek terpisah) supaya tidak
  // perlu render tambahan cuma untuk mengoreksi halaman.
  const currentPage = Math.min(page, totalPages);
  const pageArticles = useMemo(
    () => articles.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [articles, currentPage]
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-3xl font-bold text-primary-900">Bacaan</h1>
        {canWrite ? (
          <Link to="/bacaan/tulis" className="btn-primary">
            + Tulis Artikel
          </Link>
        ) : user ? (
          <span className="text-xs text-gray-400">Akun harus terverifikasi untuk menulis artikel</span>
        ) : (
          <Link to="/login" className="btn-secondary">
            Masuk untuk menulis
          </Link>
        )}
      </div>

      {loading && <p className="text-sm text-gray-400">Memuat artikel...</p>}
      {!loading && articles.length === 0 && (
        <p className="text-sm text-gray-400">Belum ada artikel yang dipublikasikan.</p>
      )}

      <div className="grid sm:grid-cols-2 gap-5">
        {pageArticles.map((a) => (
          <Link key={a.id} to={`/bacaan/${a.slug}`} className="card hover:shadow-md transition-shadow">
            {a.cover_image_url && (
              <img src={a.cover_image_url} alt="" className="w-full h-36 object-cover rounded-lg mb-3" />
            )}
            <h2 className="font-semibold text-gray-800 mb-1 line-clamp-2">{a.title}</h2>
            <p className="text-xs text-gray-400">
              {a.author_name ? `Oleh ${a.author_name}` : ""}
              {a.published_at ? ` · ${new Date(a.published_at).toLocaleDateString("id-ID")}` : ""}
            </p>
          </Link>
        ))}
      </div>

      {!loading && articles.length > PAGE_SIZE && (
        <div className="flex items-center justify-center gap-3 mt-8 text-sm text-gray-600">
          <button
            className="btn-secondary !py-1.5 !px-3 text-xs"
            disabled={currentPage <= 1}
            onClick={() => setPage(Math.max(1, currentPage - 1))}
          >
            ‹ Sebelumnya
          </button>
          <span>
            Halaman {currentPage} dari {totalPages}
          </span>
          <button
            className="btn-secondary !py-1.5 !px-3 text-xs"
            disabled={currentPage >= totalPages}
            onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
          >
            Berikutnya ›
          </button>
        </div>
      )}
    </div>
  );
}
