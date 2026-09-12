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
