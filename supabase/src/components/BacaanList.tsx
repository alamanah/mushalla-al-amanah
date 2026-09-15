import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { stripHtml } from "../lib/sanitizeHtml";
import { IconChevronLeft, IconChevronRight } from "./icons";
import { Article } from "../types";

/** Widget "Bacaan" di beranda -- gaya carousel serupa Jadwal Kajian (satu
 * artikel tampil bergantian otomatis tiap beberapa detik), menampilkan 5
 * artikel terbaru yang sudah terbit. Tombol "Lihat Semua Bacaan" mengarah
 * ke halaman /bacaan yang berisi daftar lengkap + paginasi. */
export default function BacaanList() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    supabase
      .from("articles")
      .select("*")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(5)
      .then(({ data }) => {
        setArticles((data as Article[]) ?? []);
        setLoading(false);
      });
  }, []);

  const total = articles.length;
  const activeSlide = total > 0 ? ((slide % total) + total) % total : 0;
  const current = articles[activeSlide];
  const goTo = (i: number) => setSlide(((i % total) + total) % total);

  useEffect(() => {
    if (total <= 1) return;
    const id = setInterval(() => setSlide((s) => s + 1), 6000);
    return () => clearInterval(id);
  }, [total]);

  // Kalau belum ada artikel sama sekali (mis. situs baru dipasang), widget
  // ini tidak usah tampil daripada menampilkan kotak kosong di beranda.
  if (!loading && total === 0) return null;

  return (
    <div className="panel">
      <div className="flex items-center justify-between gap-2 mb-4">
        <h3 className="font-serif font-bold text-lg text-primary-900">Bahan Bacaan</h3>
        <Link to="/bacaan" className="text-xs font-medium text-primary-700 hover:text-primary-800 shrink-0">
          Lebih Banyak &rarr;
        </Link>
      </div>

      {loading && <p className="text-sm text-gray-400">Memuat bacaan...</p>}

      {!loading && current && (
        <>
          <Link
            to={`/bacaan/${current.slug}`}
            className="relative block h-[220px] rounded-xl overflow-hidden border border-gray-100"
          >
            {current.cover_image_url ? (
              <img src={current.cover_image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-primary-800 to-primary-950" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

            {total > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    goTo(slide - 1);
                  }}
                  aria-label="Bacaan sebelumnya"
                  className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white/85 hover:bg-white text-gray-700 flex items-center justify-center shadow transition-colors"
                >
                  <IconChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    goTo(slide + 1);
                  }}
                  aria-label="Bacaan berikutnya"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white/85 hover:bg-white text-gray-700 flex items-center justify-center shadow transition-colors"
                >
                  <IconChevronRight className="h-4 w-4" />
                </button>
              </>
            )}

            <div className="absolute inset-x-0 bottom-0 px-5 py-3.5">
              <p className="text-white font-serif font-bold text-lg leading-snug line-clamp-2">{current.title}</p>
              <p className="text-white/70 text-xs mt-1 line-clamp-1">
                {current.author_name ? `Oleh ${current.author_name}` : ""}
                {current.published_at ? ` · ${new Date(current.published_at).toLocaleDateString("id-ID")}` : ""}
              </p>
            </div>
          </Link>

          {current.content && (
            <p className="text-xs text-gray-500 mt-2 line-clamp-2">{stripHtml(current.content)}</p>
          )}

          {total > 1 && (
            <div className="flex items-center justify-center gap-1.5 mt-3">
              {articles.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  aria-label={`Ke bacaan ke-${i + 1}`}
                  className={`h-1.5 rounded-full transition-all ${
                    i === activeSlide ? "w-5 bg-primary-700" : "w-1.5 bg-gray-300"
                  }`}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
