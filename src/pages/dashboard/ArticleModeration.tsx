import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { Article } from "../../types";

export default function ArticleModeration() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [filter, setFilter] = useState<"pending" | "published" | "rejected" | "all">("pending");
  const [loading, setLoading] = useState(true);
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const load = async () => {
    setLoading(true);
    let query = supabase.from("articles").select("*").order("created_at", { ascending: false });
    if (filter !== "all") query = query.eq("status", filter);
    const { data } = await query;
    setArticles((data as Article[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const approve = async (id: string) => {
    await supabase
      .from("articles")
      .update({ status: "published", published_at: new Date().toISOString(), rejection_note: null })
      .eq("id", id);
    load();
  };

  const reject = async (id: string) => {
    await supabase.from("articles").update({ status: "rejected", rejection_note: note || null }).eq("id", id);
    setNoteFor(null);
    setNote("");
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-2xl font-bold text-primary-900">Moderasi Artikel</h1>
        <select className="input max-w-[160px]" value={filter} onChange={(e) => setFilter(e.target.value as any)}>
          <option value="pending">Menunggu</option>
          <option value="published">Terbit</option>
          <option value="rejected">Ditolak</option>
          <option value="all">Semua</option>
        </select>
      </div>

      {loading && <p className="text-sm text-gray-400">Memuat...</p>}
      {!loading && articles.length === 0 && <p className="text-sm text-gray-400">Tidak ada artikel.</p>}

      <div className="space-y-3">
        {articles.map((a) => (
          <div key={a.id} className="card">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-gray-800">{a.title}</p>
                <p className="text-xs text-gray-400 mb-2">Oleh {a.author_name || "-"}</p>
                <p className="text-sm text-gray-600 line-clamp-3 whitespace-pre-wrap">{a.content}</p>
              </div>
              <span className="badge bg-gray-100 text-gray-600 shrink-0 capitalize">{a.status}</span>
            </div>
            {a.status === "pending" && (
              <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                <button className="btn-primary !py-1 !px-3 text-xs" onClick={() => approve(a.id)}>
                  Setujui &amp; Terbitkan
                </button>
                {noteFor === a.id ? (
                  <>
                    <input
                      className="input !py-1 text-xs max-w-xs"
                      placeholder="Alasan penolakan (opsional)"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                    />
                    <button className="btn-danger !py-1 !px-3 text-xs" onClick={() => reject(a.id)}>
                      Kirim Penolakan
                    </button>
                  </>
                ) : (
                  <button className="btn-danger !py-1 !px-3 text-xs" onClick={() => setNoteFor(a.id)}>
                    Tolak
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
