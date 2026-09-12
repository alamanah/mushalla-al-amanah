import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { SocialLink } from "../types";
import { platformStyle } from "../lib/socialPlatforms";

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
    <div className="panel">
      <h3 className="font-serif font-bold text-lg text-primary-900 mb-3">Ikuti Media Sosial Kami</h3>
      <div className="flex flex-wrap gap-3">
        {links.map((l) => {
          const style = platformStyle(l.platform);
          return (
            <a
              key={l.id}
              href={l.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2.5 rounded-full border border-gray-200 pl-2 pr-4 py-1.5 text-sm font-medium text-gray-700 hover:border-primary-300 hover:bg-primary-50 transition-colors capitalize"
            >
              <span className={`flex items-center justify-center h-8 w-8 rounded-full shrink-0 ${style.bg}`}>{style.icon}</span>
              {l.platform}
            </a>
          );
        })}
      </div>
    </div>
  );
}
