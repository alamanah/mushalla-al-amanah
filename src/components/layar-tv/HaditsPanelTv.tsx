import { haditsHariIni } from "../../lib/haditsPilihan";

/**
 * Slide "Hadits Pilihan" khusus halaman Layar TV -- satu hadits ditampilkan
 * besar & terpusat gaya kutipan, berganti otomatis tiap hari (lihat
 * `haditsHariIni` di src/lib/haditsPilihan.ts). Tidak perlu data dari
 * Supabase sama sekali, jadi selalu tampil normal walau internet mushalla
 * sedang bermasalah.
 */
export default function HaditsPanelTv() {
  const hadits = haditsHariIni();

  return (
    <div className="h-full flex flex-col items-center justify-center text-center px-6">
      <p className="text-xs uppercase tracking-widest text-primary-500 mb-8">Hadits Pilihan Hari Ini</p>
      <span className="font-serif text-primary-200 text-8xl leading-none mb-2 select-none">&ldquo;</span>
      <p className="font-serif text-primary-900 text-3xl leading-relaxed max-w-3xl -mt-8">{hadits.teks}</p>
      <div className="mt-8 h-1 w-16 rounded-full bg-gold-500" />
      <p className="text-gray-500 text-lg mt-4">{hadits.sumber}</p>
    </div>
  );
}
