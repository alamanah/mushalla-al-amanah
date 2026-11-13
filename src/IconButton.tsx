import { ReactNode } from "react";

type Variant = "default" | "active" | "muted" | "danger" | "live";

const VARIANT_CLASS: Record<Variant, string> = {
  default: "text-gray-500 hover:text-primary-700 hover:bg-primary-50",
  active: "text-primary-700 bg-primary-50 hover:bg-primary-100",
  muted: "text-gray-400 hover:text-gray-600 hover:bg-gray-100",
  danger: "text-red-500 hover:text-red-700 hover:bg-red-50",
  live: "text-red-600 bg-red-50 hover:bg-red-100",
};

interface Props {
  /** Label singkat aksi ini -- dipakai sebagai tooltip (title) & aria-label,
   * karena tombolnya cuma menampilkan ikon tanpa tulisan. */
  label: string;
  onClick: () => void;
  children: ReactNode;
  variant?: Variant;
  disabled?: boolean;
  className?: string;
}

/** Tombol aksi ikon-saja (bulat, tanpa teks) dipakai di daftar Jadwal Kajian
 * & Jadwal Khatib Jumat (Dashboard > Pengaturan Konten) supaya ringkas --
 * label aksinya tetap ada lewat tooltip/aria-label untuk aksesibilitas. */
export default function IconButton({ label, onClick, children, variant = "default", disabled, className }: Props) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center h-8 w-8 shrink-0 rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${VARIANT_CLASS[variant]} ${className ?? ""}`}
    >
      {children}
    </button>
  );
}
