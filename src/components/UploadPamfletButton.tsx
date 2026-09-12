import { ChangeEvent, useRef, useState } from "react";
import { isPamfletUploadConfigured, uploadPamfletToDrive } from "../lib/pamfletUpload";

interface Props {
  /** Dipanggil dengan link Google Drive hasil upload setelah berhasil. */
  onUploaded: (link: string) => void;
  className?: string;
}

/**
 * Tombol "Upload ke Google Drive": pilih gambar dari perangkat, otomatis
 * diunggah lewat Google Apps Script ke folder "Pamflet" di Google Drive akun
 * yang men-deploy script-nya (dibuat otomatis kalau belum ada), dibagikan
 * "siapa saja yang punya link", lalu link-nya dikirim ke `onUploaded`.
 * Nonaktif diam-diam (tidak dirender) kalau VITE_GAS_UPLOAD_URL belum
 * dikonfigurasi -- lihat supabase/SETUP.md bagian "Upload Pamflet otomatis
 * ke Google Drive".
 */
export default function UploadPamfletButton({ onUploaded, className }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isPamfletUploadConfigured()) return null;

  const handleChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // supaya bisa pilih file yang sama lagi kalau mau coba ulang
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("File harus berupa gambar.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("Ukuran gambar maksimal 8MB.");
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const link = await uploadPamfletToDrive(file);
      onUploaded(link);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengunggah ke Google Drive.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={className}>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleChange} />
      <button
        type="button"
        className="btn-secondary text-xs !py-1.5"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? "Mengunggah..." : "📤 Upload ke Google Drive"}
      </button>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
