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

/** Badge bulat berwarna khas tiap platform + ikon glyph putih -- dipakai
 * bareng oleh SocialLinks.tsx (card "Ikuti Media Sosial Kami") dan
 * Footer.tsx supaya gaya ikonnya konsisten di semua tempat. */
export const PLATFORM_STYLE: Record<string, { bg: string; icon: ReactNode }> = {
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
export const FALLBACK_PLATFORM_STYLE = { bg: "bg-gray-400", icon: <IconLinkGlyph className="h-[18px] w-[18px]" /> };

export function platformStyle(platform: string) {
  return PLATFORM_STYLE[platform.toLowerCase()] ?? FALLBACK_PLATFORM_STYLE;
}
