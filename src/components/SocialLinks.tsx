import { ReactNode, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { SocialLink } from "../types";
import {
  IconFacebookGlyph,
  IconGlobeGlyph,
  IconInstagramGlyph,
  IconLinkGlyph,
  IconTiktokGlyph,
  IconWhatsappGlyph,
  IconYoutubeGlyph,
} from "./icons";

// Badge bulat berwarna khas tiap platform + ikon glyph putih di atasnya --
// ganti dari emoji (📷/📘/▶️/...) yang tampilannya beda-beda & kurang rapi
// antar perangkat, ke ikon buatan sendiri yang konsisten.
const PLATFORM_STYLE: Record<string, { bg: string; icon: ReactNode }> = {
  instagram: {
    bg: "bg-gradient-to-tr from-[#FEE411] via-[#FD1D1D] to-[#833AB4]",
    icon: <IconInstagramGlyph className="h-[18px] w-[18px]" />,
  },
  facebook: { bg: "bg-[#1877F2]", icon: <IconFacebookGlyph className="h-[18px] w-[18px]" /> },
  youtube: { bg: "bg-[#FF0000]", icon: <IconYoutubeGlyph className="h-[18px] w-[18px]" /> },
  tiktok: { bg: "bg-black", icon: <IconTiktokGlyph className="h-[18px] w-[18px]" /> },
  whatsapp: { bg: "bg-[#25D366]", icon: <IconWhatsappGlyph className="h-[18px] w-[18px]" /> },
  website: { bg: "bg-primary-700", icon: <IconGlobeGlyph className="h-[18px] w-[18px]" /> },
};
const FALLBACK_STYLE = { bg: "bg-gray-400", icon: <IconLinkGlyph className="h-[18px] w-[18px]" /> };

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
        {links.map((l) => {
          const style = PLATFORM_STYLE[l.platform.toLowerCase()] ?? FALLBACK_STYLE;
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
