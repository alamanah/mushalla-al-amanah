import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
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

export default function ArticleEditor() {
  const { user, profile } = useAuth();
  const [title, setTitle] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [myArticles, setMyArticles] = useState<Article[]>([]);

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
    const { error } = await supabase.from("articles").insert({
      title,
      slug: slugify(title),
      content,
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

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="font-serif text-3xl font-bold text-primary-900 mb-6">Tulis Artikel</h1>

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
          <textarea
            required
            rows={10}
            className="input"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="btn-primary" disabled={saving}>
          {saving ? "Mengirim..." : "Kirim untuk Ditinjau"}
        </button>
        <p className="text-xs text-gray-400">
          Artikel akan tampil publik setelah disetujui oleh admin.
        </p>
      </form>

      <h2 className="font-semibold text-gray-800 mb-3">Artikel Saya</h2>
      <div className="space-y-2">
        {myArticles.length === 0 && <p className="text-sm text-gray-400">Belum ada artikel.</p>}
        {myArticles.map((a) => (
          <div key={a.id} className="card flex items-center justify-between py-3">
            <div>
              <p className="font-medium text-gray-800">{a.title}</p>
              {a.status === "rejected" && a.rejection_note && (
                <p className="text-xs text-red-500 mt-1">Catatan: {a.rejection_note}</p>
              )}
            </div>
            <span className={`badge ${STATUS_COLOR[a.status]}`}>{STATUS_LABEL[a.status]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
