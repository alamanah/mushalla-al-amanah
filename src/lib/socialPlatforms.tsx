import { ReactNode } from "react";
import {
  IconFacebookGlyph,
  IconGlobeGlyph,
  IconInstagramGlyph,
  IconLinkGlyph,
  IconTiktokGlyph,
  IconWhatsappGlyph,
  IconYoutubeGlyph,
} from "../components/icons";

/** Badge bulat flat hitam-putih (bukan warna-warni khas brand) + ikon
 * monokrom -- dipakai di Footer.tsx supaya gaya ikonnya konsisten dan
 * senada dengan tampilan situs yang minimalis/flat. Warnanya ikut
 * currentColor lewat class "bg-*"/"text-*" di sini, jadi tinggal ganti di
 * satu tempat kalau suatu saat mau diubah lagi. */
const ICON_SIZE = "h-[17px] w-[17px]";
export const PLATFORM_STYLE: Record<string, { bg: string; icon: ReactNode }> = {
  instagram: { bg: "bg-gray-100 text-gray-700", icon: <IconInstagramGlyph className={ICON_SIZE} /> },
  facebook: { bg: "bg-gray-100 text-gray-700", icon: <IconFacebookGlyph className={ICON_SIZE} /> },
  youtube: { bg: "bg-gray-100 text-gray-700", icon: <IconYoutubeGlyph className={ICON_SIZE} /> },
  tiktok: { bg: "bg-gray-100 text-gray-700", icon: <IconTiktokGlyph className={ICON_SIZE} /> },
  whatsapp: { bg: "bg-gray-100 text-gray-700", icon: <IconWhatsappGlyph className={ICON_SIZE} /> },
  website: { bg: "bg-gray-100 text-gray-700", icon: <IconGlobeGlyph className={ICON_SIZE} /> },
};
export const FALLBACK_PLATFORM_STYLE = { bg: "bg-gray-100 text-gray-700", icon: <IconLinkGlyph className={ICON_SIZE} /> };

export function platformStyle(platform: string) {
  return PLATFORM_STYLE[platform.toLowerCase()] ?? FALLBACK_PLATFORM_STYLE;
}

/** Ambil nomor dari link WhatsApp (wa.me/api.whatsapp.com dengan query
 * "phone", format internasional "62..." -- lihat cara link ini dibuat di
 * Settings.tsx) lalu ubah ke format lokal "08..." supaya lebih gampang
 * dibaca/dihafal jamaah, dipakai gantinya link mentah (lihat
 * SosmedPanelTv.tsx). Balikin null kalau link bukan format itu, supaya
 * pemanggilnya bisa fallback tampilkan url apa adanya. */
export function formatNomorWa(url: string): string | null {
  try {
    const phone = new URL(url).searchParams.get("phone");
    if (!phone) return null;
    const digits = phone.replace(/\D/g, "");
    if (!digits) return null;
    return digits.startsWith("62") ? `0${digits.slice(2)}` : digits;
  } catch {
    return null;
  }
}
