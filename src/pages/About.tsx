import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { AboutContent } from "../types";
import { mapsEmbedUrl, mapsOpenUrl } from "../lib/mapsLink";
import { IconMapPin } from "../components/icons";

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

  const address = content?.address?.trim() || "";

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

      {address && (
        <div className="card mt-6">
          <h2 className="font-serif text-lg font-semibold text-primary-900 flex items-center gap-2 mb-3">
            <IconMapPin className="w-5 h-5 text-primary-700" />
            Alamat
          </h2>
          <p className="text-sm text-gray-700 mb-4">{address}</p>
          <div className="rounded-lg overflow-hidden border border-gray-200">
            <iframe
              title="Lokasi Mushalla Al Amanah"
              src={mapsEmbedUrl(address)}
              className="w-full h-64 md:h-80"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
          <a
            href={mapsOpenUrl(address, content?.maps_url)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary inline-flex items-center gap-2 mt-4"
          >
            <IconMapPin className="w-4 h-4" />
            Buka di Google Maps
          </a>
        </div>
      )}
    </div>
  );
}
