import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { AboutContent } from "../../types";
import { mapsOpenUrl } from "../../lib/mapsLink";
import { IconMapPin } from "../icons";

export default function Footer() {
  const [about, setAbout] = useState<AboutContent | null>(null);

  useEffect(() => {
    supabase
      .from("about_content")
      .select("address, maps_url")
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setAbout(data as AboutContent | null));
  }, []);

  const address = about?.address?.trim() || "";

  return (
    <footer className="bg-primary-950 text-white/70 mt-16">
      <div className="max-w-6xl mx-auto px-4 py-8 text-sm flex flex-col md:flex-row justify-between gap-4">
        <div>
          <p className="text-white font-serif font-semibold">Mushalla Al Amanah</p>
          <p>GKN I Denpasar</p>
          {address && (
            <a
              href={mapsOpenUrl(address, about?.maps_url)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 mt-2 text-white/70 hover:text-white transition-colors"
            >
              <IconMapPin className="w-4 h-4 shrink-0" />
              <span>{address}</span>
            </a>
          )}
        </div>
        <p>&copy; {new Date().getFullYear()} Mushalla Al Amanah GKN I Denpasar. Semua hak cipta dilindungi.</p>
      </div>
    </footer>
  );
}
