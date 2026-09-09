import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { AboutContent } from "../types";

export default function About() {
  const [content, setContent] = useState<AboutContent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("about_content")
      .select("*")
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        setContent(data as AboutContent | null);
        setLoading(false);
      });
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="font-serif text-3xl font-bold text-primary-900 mb-6">Tentang Mushalla Al Amanah</h1>
      <div className="card">
        {loading && <p className="text-sm text-gray-400">Memuat...</p>}
        {!loading && !content && (
          <p className="text-sm text-gray-400">
            Profil mushalla belum diisi oleh admin. Silakan lengkapi di halaman Pengaturan Konten.
          </p>
        )}
        {content && (
          <div className="prose prose-sm max-w-none whitespace-pre-wrap text-gray-700">
            {content.content}
          </div>
        )}
      </div>
    </div>
  );
}
