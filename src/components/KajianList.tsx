import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { driveImageUrl } from "../lib/driveLink";
import { bulanKeyDari, bulanKeySekarang, bulanOptionsDari, labelBulan } from "../lib/bulanFilter";
import { openYoutubeLink, resolveYoutubeLink } from "../lib/youtubeLink";
import ImageLightbox from "./ImageLightbox";
import { IconChevronLeft, IconChevronRight, IconLiveDot } from "./icons";
import { KajianSchedule } from "../types";

const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

function formatTanggal(tgl: string) {
  const [y, m, d] = tgl.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("id-ID", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
}

/** Ditampilkan sebagai carousel (satu kajian besar tampil bergantian, mirip
 * gaya slider di halaman depan situs referensi) -- gambar pamflet jadi latar
 * penuh dengan judul & tanggal di atasnya, dilengkapi panah kiri/kanan dan
 * titik indikator. Kajian tanpa pamflet tetap tampil dengan latar polos. */
export default function KajianList() {
  const [items, setItems] = useState<KajianSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [bulan, setBulan] = useState(bulanKeySekarang());
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    supabase
      .from("kajian_schedule")
      .select("*")
      .eq("is_active", true)
      .order("specific_date", { ascending: false, nullsFirst: false })
      .order("day_of_week", { ascending: false, nullsFirst: false })
      .then(({ data }) => {
        setItems((data as KajianSchedule[]) ?? []);
        setLoading(false);
      });
  }, []);

  const bulanOptions = useMemo(
    () => bulanOptionsDari(items.map((k) => k.specific_date)),
    [items]
  );
  // Kajian dengan tanggal spesifik disaring sesuai bulan yang dipilih; kajian
  // rutin mingguan (tanpa tanggal spesifik) selalu ikut tampil karena
  // berlangsung tiap minggu, tidak terikat satu bulan tertentu.
  const itemsBulanIni = useMemo(
    () => items.filter((k) => !k.specific_date || bulanKeyDari(k.specific_date) === bulan),
    [items, bulan]
  );

  // Indeks slide "dibungkus" (modulo) terhadap daftar bulan yang sedang
  // aktif, bukan disimpan mentah -- jadi kalau bulan diganti dan jumlah
  // kajiannya beda, otomatis tetap dalam rentang valid tanpa perlu efek
  // terpisah untuk mereset state.
  const total = itemsBulanIni.length;
  const activeSlide = total > 0 ? ((slide % total) + total) % total : 0;
  const current = itemsBulanIni[activeSlide];
  const goTo = (i: number) => setSlide(((i % total) + total) % total);

  // Carousel otomatis geser tiap beberapa detik selama ada lebih dari 1
  // kajian yang tampil. Pakai functional update supaya interval tidak perlu
  // dibuat ulang tiap slide berubah (cukup saat jumlah item berubah).
  useEffect(() => {
    if (total <= 1) return;
    const id = setInterval(() => setSlide((s) => s + 1), 6000);
    return () => clearInterval(id);
  }, [total]);

  // Tinggi card ditetapkan tetap (bukan mengikuti tinggi card Jadwal Khatib
  // Jumat secara dinamis) supaya keduanya sejajar rapi di beranda tanpa
  // saling bergantung. Cuma berlaku di layar md ke atas; di HP tinggi
  // mengikuti isi (natural) karena card ditumpuk vertikal.
  return (
    <div className="panel flex flex-col md:h-[460px]">
      <div className="flex items-center justify-between gap-2 mb-4 flex-wrap shrink-0">
        <h3 className="font-serif font-bold text-lg text-primary-900">Jadwal Kajian</h3>
        <select className="input !w-auto !py-1 !text-xs" value={bulan} onChange={(e) => setBulan(e.target.value)}>
          {bulanOptions.map((b) => (
            <option key={b} value={b}>
              {labelBulan(b)}
            </option>
          ))}
        </select>
      </div>
      {loading && <p className="text-sm text-gray-400">Memuat jadwal kajian...</p>}
      {!loading && total === 0 && (
        <p className="text-sm text-gray-400">Belum ada jadwal kajian pada bulan ini.</p>
      )}
      {!loading && total > 0 && current && (
        <div className="flex-1 min-h-0 flex flex-col">
          <div className="relative flex-1 min-h-[220px] rounded-xl overflow-hidden border border-gray-100">
            {current.foto_url ? (
              <img
                src={driveImageUrl(current.foto_url) ?? undefined}
                alt=""
                onClick={() => setPreviewSrc(driveImageUrl(current.foto_url))}
                className="absolute inset-0 w-full h-full object-cover cursor-zoom-in"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-primary-800 to-primary-950" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

            {current.live_video_id && (
              <span className="absolute top-3 left-3 badge bg-red-600 text-white flex items-center gap-1.5">
                <IconLiveDot className="h-2 w-2" /> LIVE
              </span>
            )}

            {total > 1 && (
              <>
                <button
                  onClick={() => goTo(slide - 1)}
                  aria-label="Kajian sebelumnya"
                  className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white/85 hover:bg-white text-gray-700 flex items-center justify-center shadow transition-colors"
                >
                  <IconChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => goTo(slide + 1)}
                  aria-label="Kajian berikutnya"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white/85 hover:bg-white text-gray-700 flex items-center justify-center shadow transition-colors"
                >
                  <IconChevronRight className="h-4 w-4" />
                </button>
              </>
            )}

            <div
              className="absolute inset-x-0 bottom-0 px-11 py-3.5 cursor-pointer"
              onClick={() => openYoutubeLink(resolveYoutubeLink(current))}
              title="Buka link YouTube"
            >
              <p className="text-sm font-semibold text-gold-400">
                {current.specific_date
                  ? formatTanggal(current.specific_date)
                  : current.day_of_week !== null
                  ? HARI[current.day_of_week]
                  : ""}{" "}
                &middot; {current.time_text}
              </p>
              <p className="text-white font-serif font-bold text-lg leading-snug mt-0.5">{current.title}</p>
              <p className="text-white/70 text-xs mt-1">
                {current.ustadz ? `Bersama ${current.ustadz}` : ""} {current.location ? `· ${current.location}` : ""}
              </p>
            </div>
          </div>

          {total > 1 && (
            <div className="flex items-center justify-center gap-1.5 mt-3 shrink-0">
              {itemsBulanIni.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  aria-label={`Ke kajian ke-${i + 1}`}
                  className={`h-1.5 rounded-full transition-all ${
                    i === activeSlide ? "w-5 bg-primary-700" : "w-1.5 bg-gray-300"
                  }`}
                />
              ))}
            </div>
          )}

          {current.description && (
            <p className="text-xs text-gray-400 mt-2 line-clamp-2 shrink-0">{current.description}</p>
          )}

          {current.live_video_id && (
            <div className="mt-3 aspect-video rounded-lg overflow-hidden border border-gray-100 shrink-0">
              <iframe
                src={`https://www.youtube.com/embed/${current.live_video_id}`}
                title={`Live: ${current.title}`}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}
        </div>
      )}
      {previewSrc && <ImageLightbox src={previewSrc} onClose={() => setPreviewSrc(null)} />}
    </div>
  );
}
