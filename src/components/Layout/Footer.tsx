import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { AboutContent, SocialLink } from "../../types";
import { mapsOpenUrl } from "../../lib/mapsLink";
import { platformStyle } from "../../lib/socialPlatforms";
import { IconMapPin } from "../icons";

export default function Footer() {
  const [about, setAbout] = useState<AboutContent | null>(null);
  const [links, setLinks] = useState<SocialLink[]>([]);

  useEffect(() => {
    supabase
      .from("about_content")
      .select("address, maps_url")
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setAbout(data as AboutContent | null));
    supabase
      .from("social_links")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .then(({ data }) => setLinks((data as SocialLink[]) ?? []));
  }, []);

  const address = about?.address?.trim() || "";

  return (
    <footer className="bg-white border-t border-gray-100 mt-16">
      <div className="max-w-6xl mx-auto px-4 pt-10 pb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          <div>
            <Link to="/" className="flex items-center gap-2">
              <img
                src={`${import.meta.env.BASE_URL}logo-al-amanah.png`}
                className="h-10 w-auto"
                alt="Logo Mushalla Al Amanah"
              />
              <span className="font-semibold text-primary-900 leading-tight">
                Mushalla
                <br />
                Al Amanah
              </span>
            </Link>
            <p className="text-sm text-gray-500 mt-3">GKN I Denpasar &middot; Bersama Menuju Allah</p>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-gray-400 tracking-wider uppercase mb-3">Media Sosial</h4>
            {links.length === 0 ? (
              <p className="text-sm text-gray-400">Belum ada tautan.</p>
            ) : (
              <ul className="space-y-2.5 text-sm">
                {links.map((l) => {
                  const style = platformStyle(l.platform);
                  const label = l.display_name?.trim() || l.platform;
                  return (
                    <li key={l.id}>
                      <a
                        href={l.url}
                        target="_blank"
                        rel="noreferrer"
                        className="group flex items-center gap-2 text-gray-600 hover:text-primary-700 transition-colors"
                      >
                        <span
                          className={`flex items-center justify-center h-6 w-6 rounded-full shrink-0 transition-colors group-hover:bg-primary-50 group-hover:text-primary-700 ${style.bg}`}
                        >
                          {style.icon}
                        </span>
                        <span className={l.display_name?.trim() ? "" : "capitalize"}>{label}</span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div>
            <h4 className="text-xs font-semibold text-gray-400 tracking-wider uppercase mb-3">Kontak</h4>
            {address ? (
              <a
                href={mapsOpenUrl(address, about?.maps_url)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-2 text-sm text-gray-600 hover:text-primary-700 transition-colors"
              >
                <IconMapPin className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{address}</span>
              </a>
            ) : (
              <p className="text-sm text-gray-400">Alamat belum diisi.</p>
            )}
          </div>
        </div>

        <div className="border-t border-gray-100 mt-8 pt-5 text-xs text-gray-400 text-center">
          &copy; {new Date().getFullYear()} Mushalla Al Amanah GKN I Denpasar. Semua hak cipta dilindungi.
        </div>
      </div>
    </footer>
  );
}
