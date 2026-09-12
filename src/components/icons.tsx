import { SVGProps } from "react";

// Kumpulan ikon garis sederhana (dibuat sendiri, bukan dari library luar) --
// dipakai untuk tombol aksi di daftar Jadwal Kajian & Jadwal Khatib Jumat
// (Dashboard > Pengaturan Konten) supaya lebih ringkas daripada tombol
// bertuliskan teks. Semua ikon memakai currentColor supaya warnanya
// mengikuti className tombol pembungkusnya (lihat IconButton.tsx).

type IconProps = SVGProps<SVGSVGElement>;

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function IconEye(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M2 12S5.5 5 12 5s10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function IconEyeOff(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M3 3l18 18" />
      <path d="M6.6 6.7C4 8.4 2 12 2 12s3.5 7 10 7c1.4 0 2.7-.3 3.8-.8" />
      <path d="M10.6 5.2c.5-.1.9-.2 1.4-.2 6.5 0 10 7 10 7a16 16 0 0 1-3.1 4" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </svg>
  );
}

export function IconImage(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="8.5" cy="9.5" r="1.5" />
      <path d="M21 16.5l-5.6-5.4a2 2 0 0 0-2.8 0L4 19" />
    </svg>
  );
}

export function IconYoutube(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="2.5" y="5.5" width="19" height="13" rx="4" />
      <path d="M10.3 9.4v5.2l4.8-2.6-4.8-2.6Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconTrash(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 7h16" />
      <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
      <path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

export function IconLiveDot(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="3.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconStop(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="6.5" y="6.5" width="11" height="11" rx="2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconRefresh(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 4v5h5" />
      <path d="M20 20v-5h-5" />
      <path d="M5 15a8 8 0 0 0 14.3 3.5M19 9A8 8 0 0 0 4.7 5.5" />
    </svg>
  );
}

export function IconCheckBadge(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 12.3l2.3 2.2 4.7-4.6" />
    </svg>
  );
}

export function IconClock(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5l3.3 1.9" />
    </svg>
  );
}

// ---- Ikon media sosial (glyph putih polos, dipasang di atas badge bulat
// berwarna brand masing-masing platform -- lihat SocialLinks.tsx) ----

export function IconInstagramGlyph(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17" cy="7" r="1.1" fill="white" stroke="none" />
    </svg>
  );
}

export function IconFacebookGlyph(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="white" stroke="none" {...props}>
      <path d="M14.5 8.5h2V5.7c-.35-.05-1.55-.15-2.96-.15-2.93 0-4.94 1.79-4.94 5.07v2.63H6v3.2h3.6V21h3.3v-4.55h3.17l.5-3.2h-3.67v-2.3c0-.93.26-1.45 1.6-1.45Z" />
    </svg>
  );
}

export function IconYoutubeGlyph(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="white" stroke="none" {...props}>
      <path d="M9.5 8.2v7.6l6.5-3.8-6.5-3.8Z" />
    </svg>
  );
}

export function IconTiktokGlyph(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="white" stroke="none" {...props}>
      <path d="M14 4v9.5a3.5 3.5 0 1 1-3.2-3.48V8.9A5.6 5.6 0 1 0 16 14.4V9.8a6.6 6.6 0 0 0 3.6 1.07V8.8A4.6 4.6 0 0 1 15.9 4H14Z" />
    </svg>
  );
}

export function IconWhatsappGlyph(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M6.5 17.5 5 20l2.6-1.4A7.5 7.5 0 1 0 6.5 17.5Z" />
      <path
        d="M9.5 9.8c.2-.6.5-.6.8-.6h.5c.2 0 .4 0 .6.4.2.4.6 1.4.7 1.5.1.1.1.3 0 .5-.1.2-.2.3-.4.5-.2.2-.4.4-.2.7.2.4 1 1.5 2.1 2 .3.2.5.1.7-.1.2-.2.4-.5.6-.7.2-.2.3-.2.6-.1.2.1 1.5.7 1.8.8.3.1.4.2.5.3.1.2.1.9-.2 1.3-.3.5-1.3 1-1.9 1-.6 0-1.5-.1-3.2-1.3-2-1.4-3.3-3.4-3.4-3.6-.1-.2-.9-1.3-.9-2.4 0-1.1.6-1.7.8-1.9Z"
        fill="white"
        stroke="none"
      />
    </svg>
  );
}

export function IconGlobeGlyph(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17M12 3.5c2.2 2.3 3.4 5.2 3.4 8.5s-1.2 6.2-3.4 8.5c-2.2-2.3-3.4-5.2-3.4-8.5S9.8 5.8 12 3.5Z" />
    </svg>
  );
}

export function IconChevronLeft(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}

export function IconChevronRight(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M9 5l7 7-7 7" />
    </svg>
  );
}

export function IconMapPin(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 21s-7-6.1-7-11.5A7 7 0 0 1 19 9.5C19 14.9 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </svg>
  );
}

export function IconLinkGlyph(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M9.5 14.5 14.5 9.5" />
      <path d="M11 7.5l1.4-1.4a3.5 3.5 0 0 1 5 5L16 12.5" />
      <path d="M13 16.5l-1.4 1.4a3.5 3.5 0 1 1-5-5L8 11.5" />
    </svg>
  );
}
