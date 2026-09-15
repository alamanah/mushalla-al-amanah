import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { sanitizeArticleHtml, stripHtml } from "../lib/sanitizeHtml";
import RichTextEditor from "../components/RichTextEditor";
import { Article } from "../types";

function slugify(title: string) {
  return (
    title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-") + "-" + Date.now().toString(36)
  );
}

const STATUS_LABEL: Record<string, string> = {
  draft: "Draf",
  pending: "Menunggu Review",
  published: "Terbit",
  rejected: "Ditolak",
};
const STATUS_COLOR: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  pending: "bg-yellow-100 text-yellow-700",
  published: "bg-primary-100 text-primary-700",
  rejected: "bg-red-100 text-red-700",
};

/** Satu halaman dipakai untuk dua mode: tulis baru (/bacaan/tulis) dan
 * ubah artikel yang sudah ada (/bacaan/edit/:id) -- form & validasinya
 * sama persis, cuma beda aksi submit-nya (insert vs update). */
export default function ArticleEditor() {
  const { id } = useParams();
  const isEditMode = !!id;
  const navigate = useNavigate();
  const { user, profile, isAdmin } = useAuth();
  const [title, setTitle] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [myArticles, setMyArticles] = useState<Article[]>([]);

  const [editArticle, setEditArticle] = useState<Article | null>(null);
  const [loadingEdit, setLoadingEdit] = useState(isEditMode);
  const [notAllowed, setNotAllowed] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoadingEdit(true);
    setNotAllowed(false);
    supabase
      .from("articles")
      .select("*")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => {
        const a = data as Article | null;
        // RLS cuma mengizinkan SELECT baris ini kalau penulisnya sendiri,
        // admin, atau statusnya published -- jadi kalau `data` kosong,
        // artinya bukan artikel milik sendiri (atau memang tidak ada).
        if (!a || (!isAdmin && a.author_id !== user?.id)) {
          setNotAllowed(true);
        } else {
          setEditArticle(a);
          setTitle(a.title);
          setCoverUrl(a.cover_image_url ?? "");
          setContent(a.content);
        }
        setLoadingEdit(false);
      });
  }, [id, user?.id, isAdmin]);

  const loadMine = () => {
    if (!user) return;
    supabase
      .from("articles")
      .select("*")
      .eq("author_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setMyArticles((data as Article[]) ?? []));
  };

  useEffect(loadMine, [user]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError(null);
    setSaving(true);
    const cleanContent = sanitizeArticleHtml(content);

    if (isEditMode && editArticle) {
      const updates: Partial<Article> = {
        title,
        content: cleanContent,
        cover_image_url: coverUrl || null,
      };
      // Kalau yang mengubah bukan admin dan artikelnya sudah terbit,
      // otomatis balik ke "menunggu review" -- supaya perubahan isinya
      // tetap dicek admin dulu sebelum tampil lagi ke publik.
      if (!isAdmin && editArticle.status === "published") {
        updates.status = "pending";
        updates.rejection_note = null;
      }
      const { error } = await supabase.from("articles").update(updates).eq("id", editArticle.id);
      setSaving(false);
      if (error) {
        setError("Gagal menyimpan perubahan: " + error.message);
        return;
      }
      navigate("/bacaan/tulis");
      return;
    }

    const { error } = await supabase.from("articles").insert({
      title,
      slug: slugify(title),
      content: cleanContent,
      cover_image_url: coverUrl || null,
      author_id: user.id,
      author_name: profile?.full_name || null,
      status: "pending",
    });
    setSaving(false);
    if (error) {
      setError("Gagal menyimpan artikel: " + error.message);
      return;
    }
    setTitle("");
    setCoverUrl("");
    setContent("");
    loadMine();
  };

  if (isEditMode && loadingEdit) {
    return <p className="max-w-3xl mx-auto px-4 py-12 text-sm text-gray-400">Memuat artikel...</p>;
  }
  if (isEditMode && notAllowed) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h1 className="font-serif text-2xl font-bold text-primary-900 mb-2">Tidak Bisa Mengubah Artikel Ini</h1>
        <p className="text-sm text-gray-500 mb-4">Artikel tidak ditemukan, atau kamu bukan penulisnya.</p>
        <Link to="/bacaan/tulis" className="text-primary-700 font-medium">
          Kembali
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="font-serif text-3xl font-bold text-primary-900 mb-6">
        {isEditMode ? "Ubah Artikel" : "Tulis Artikel"}
      </h1>

      <form onSubmit={handleSubmit} className="card space-y-4 mb-10">
        <div>
          <label className="label">Judul</label>
          <input required className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label className="label">URL Gambar Sampul (opsional)</label>
          <input className="input" value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} placeholder="https://..." />
        </div>
        <div>
          <label className="label">Isi Artikel</label>
          <RichTextEditor value={content} onChange={setContent} placeholder="Tulis isi artikel di sini..." />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="btn-primary" disabled={saving || !stripHtml(content)}>
          {saving ? "Menyimpan..." : isEditMode ? "Simpan Perubahan" : "Kirim untuk Ditinjau"}
        </button>
        {isEditMode && !isAdmin && editArticle?.status === "published" && (
          <p className="text-xs text-gray-400">
            Artikel ini sudah terbit -- karena diubah, statusnya akan kembali ke "Menunggu Review" sampai admin
            mengecek ulang.
          </p>
        )}
        {!isEditMode && <p className="text-xs text-gray-400">Artikel akan tampil publik setelah disetujui oleh admin.</p>}
      </form>

      <h2 className="font-semibold text-gray-800 mb-3">Artikel Saya</h2>
      <div className="space-y-2">
        {myArticles.length === 0 && <p className="text-sm text-gray-400">Belum ada artikel.</p>}
        {myArticles.map((a) => (
          <div key={a.id} className="card flex items-center justify-between py-3 gap-3">
            <div className="min-w-0">
              <p className="font-medium text-gray-800 truncate">{a.title}</p>
              {a.status === "rejected" && a.rejection_note && (
                <p className="text-xs text-red-500 mt-1">Catatan: {a.rejection_note}</p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`badge ${STATUS_COLOR[a.status]}`}>{STATUS_LABEL[a.status]}</span>
              <Link to={`/bacaan/edit/${a.id}`} className="btn-secondary !py-1 !px-3 text-xs">
                Ubah
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
