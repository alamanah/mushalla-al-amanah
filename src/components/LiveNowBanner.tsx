import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { openYoutubeLink, resolveYoutubeLink } from "../lib/youtubeLink";
import { IconLiveDot } from "./icons";
import { KajianSchedule } from "../types";

/** Banner mencolok di PALING ATAS beranda, di atas widget Bahan Bacaan --
 * cuma muncul kalau ada kajian yang SEDANG live saat ini (live_video_id
 * terisi), supaya jamaah yang buka web langsung tahu ada live tanpa perlu
 * scroll dulu ke widget Jadwal Kajian. Diam (return null) kalau tidak ada
 * yang live. */
export default function LiveNowBanner() {
  const [live, setLive] = useState<KajianSchedule | null>(null);

  useEffect(() => {
    supabase
      .from("kajian_schedule")
      .select("*")
      .eq("is_active", true)
      .then(({ data }) => {
        const rows = (data as KajianSchedule[]) ?? [];
        setLive(rows.find((k) => k.live_video_id) ?? null);
      });
  }, []);

  if (!live) return null;

  return (
    <button
      onClick={() => openYoutubeLink(resolveYoutubeLink(live))}
      className="w-full flex items-center gap-3 bg-red-600 hover:bg-red-700 text-white rounded-xl px-4 py-3 mb-6 transition-colors text-left"
    >
      <span className="shrink-0 h-9 w-9 rounded-full bg-white/15 flex items-center justify-center">
        <IconLiveDot className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold uppercase tracking-wide text-red-100">Kajian Live Saat Ini</span>
        <span className="block font-serif font-bold leading-snug truncate">{live.title}</span>
      </span>
      <span className="shrink-0 text-xs font-medium text-red-100">Tonton &rarr;</span>
    </button>
  );
}
