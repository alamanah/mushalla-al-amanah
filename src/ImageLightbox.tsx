interface Props {
  src: string;
  onClose: () => void;
}

/** Popup gambar ukuran penuh -- dipakai saat pamflet kajian di beranda
 * diklik. Tutup dengan klik di luar gambar atau tombol ×. */
export default function ImageLightbox({ src, onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Tutup"
        className="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/10 text-white text-2xl leading-none hover:bg-white/20 transition-colors"
      >
        ×
      </button>
      <img
        src={src}
        alt=""
        className="max-h-[90vh] max-w-full rounded-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
