import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { SocialLink } from "../types";

const ICONS: Record<string, string> = {
  instagram: "📷",
  facebook: "📘",
  youtube: "▶️",
  tiktok: "🎵",
  whatsapp: "💬",
  website: "🌐",
};

export default function SocialLinks() {
  const [links, setLinks] = useState<SocialLink[]>([]);

  useEffect(() => {
    supabase
      .from("social_links")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .then(({ data }) => setLinks((data as SocialLink[]) ?? []));
  }, []);

  if (links.length === 0) return null;

  return (
    <div className="card">
      <h3 className="font-serif font-bold text-lg text-primary-900 mb-3">Ikuti Media Sosial Kami</h3>
      <div className="flex flex-wrap gap-3">
        {links.map((l) => (
          <a
            key={l.id}
            href={l.url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 rounded-full border border-primary-200 px-4 py-2 text-sm font-medium text-primary-800 hover:bg-primary-50 capitalize"
          >
            <span>{ICONS[l.platform.toLowerCase()] || "🔗"}</span>
            {l.platform}
          </a>
        ))}
      </div>
    </div>
  );
}
