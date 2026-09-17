import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { platformStyle } from "../../lib/socialPlatforms";
import { SocialLink } from "../../types";

/**
 * Daftar channel sosial media mushalla khusus halaman Layar TV, dalam
 * bentuk list (bukan sekadar deretan ikon kecil seperti di Footer.tsx) --
 * ikon tetap ukuran wajar (bawaan komponennya, lihat socialPlatforms.tsx)
 * tapi dibungkus lingkaran besar supaya tetap terlihat jelas dari jarak TV.
 */
export default function SosmedPanelTv() {
  const [links, setLinks] = useState<SocialLink[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("social_links")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .then(({ data }) => {
        setLinks((data as SocialLink[]) ?? []);
        setLoading(false);
      });
  }, []);

  return (
    <div>
      <h2 className="font-serif font-bold text-3xl text-primary-900 mb-6">Ikuti Kami</h2>
      {loading && <p className="text-gray-400 text-lg">Memuat tautan sosial media...</p>}
      {!loading && links.length === 0 && <p className="text-gray-400 text-lg">Belum ada tautan sosial media.</p>}
      <div className="space-y-3">
        {links.map((l) => {
          const style = platformStyle(l.platform);
          const label = l.display_name?.trim() || l.platform;
          return (
            <div key={l.id} className="flex items-center gap-5 rounded-2xl border border-gray-100 bg-gray-50 px-6 py-5">
              <span className={`flex items-center justify-center h-14 w-14 rounded-full shrink-0 ${style.bg}`}>
                {style.icon}
              </span>
              <div className="min-w-0">
                <p className={`font-semibold text-gray-800 text-xl ${l.display_name?.trim() ? "" : "capitalize"}`}>
                  {label}
                </p>
                <p className="text-base text-gray-500 truncate mt-0.5">{l.url}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
