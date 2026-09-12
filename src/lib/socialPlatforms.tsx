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
