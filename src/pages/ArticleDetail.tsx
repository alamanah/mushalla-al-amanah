import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import { sanitizeArticleHtml } from "../lib/sanitizeHtml";
import { ARTICLE_CONTENT_CLASSNAME } from "../components/RichTextEditor";
import { Article } from "../types";

export default function ArticleDetail() {
  const { slug } = useParams();
  const { user, isAdmin } = useAuth();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    supabase
      .from("articles")
      .select("*")
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle()
      .then(({ data }) => {
        if (!data) {
          setNotFound(true);
        } else {
          setArticle(data as Article);
        }
        setLoading(false);
      });
  }, [slug]);

  if (loading) return <p className="text-center py-16 text-gray-400">Memuat...</p>;
  if (notFound || !article) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h1 className="font-serif text-2xl font-bold text-primary-900 mb-2">Artikel Tidak Ditemukan</h1>
        <Link to="/bacaan" className="text-primary-700 font-medium">
          Kembali ke Bacaan
        </Link>
      </div>
    );
  }

  const canEdit = isAdmin || (!!user && user.id === article.author_id);

  return (
    <article className="max-w-2xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-4">
        <Link to="/bacaan" className="text-sm text-primary-700 inline-block">
          &larr; Kembali ke Bacaan
        </Link>
        {canEdit && (
          <Link to={`/bacaan/edit/${article.id}`} className="btn-secondary !py-1 !px-3 text-xs">
            Ubah Artikel
          </Link>
        )}
      </div>
      {article.cover_image_url && (
        <img src={article.cover_image_url} alt="" className="w-full h-56 object-cover rounded-xl mb-6" />
      )}
      <h1 className="font-serif text-3xl font-bold text-primary-900 mb-2">{article.title}</h1>
      <p className="text-xs text-gray-400 mb-6">
        {article.author_name ? `Oleh ${article.author_name}` : ""}
        {article.published_at ? ` · ${new Date(article.published_at).toLocaleDateString("id-ID")}` : ""}
      </p>
      <div
        className={`max-w-none text-gray-700 leading-relaxed ${ARTICLE_CONTENT_CLASSNAME}`}
        dangerouslySetInnerHTML={{ __html: sanitizeArticleHtml(article.content) }}
      />
    </article>
  );
}
