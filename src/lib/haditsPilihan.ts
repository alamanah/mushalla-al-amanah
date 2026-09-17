export interface Hadits {
  teks: string;
  sumber: string;
}

/** Kumpulan hadits masyhur (sumbernya sudah dikenal luas & umum dikutip di
 * materi dakwah Indonesia) -- ditampilkan bergantian di slide "Hadits
 * Pilihan" halaman Layar TV (src/pages/LayarTv.tsx). Daftar tetap/lokal
 * (bukan dari API luar) SENGAJA supaya halaman tetap tampil normal walau
 * koneksi internet mushalla sedang bermasalah -- lihat `haditsHariIni` di
 * bawah, satu hadits dipilih otomatis tiap hari berdasarkan tanggal, jadi
 * berganti sendiri tanpa perlu ada yang mengelola manual.
 */
export const DAFTAR_HADITS: Hadits[] = [
  {
    teks: "Sesungguhnya setiap amalan tergantung niatnya, dan setiap orang akan mendapatkan (balasan) sesuai apa yang ia niatkan.",
    sumber: "HR. Bukhari dan Muslim",
  },
  {
    teks: "Barangsiapa beriman kepada Allah dan hari akhir, hendaklah ia berkata baik atau diam.",
    sumber: "HR. Bukhari dan Muslim",
  },
  {
    teks: "Tidak beriman salah seorang di antara kalian sehingga ia mencintai saudaranya sebagaimana ia mencintai dirinya sendiri.",
    sumber: "HR. Bukhari dan Muslim",
  },
  {
    teks: "Seorang muslim adalah yang membuat muslim lainnya selamat dari gangguan lisan dan tangannya.",
    sumber: "HR. Bukhari",
  },
  {
    teks: "Kebersihan adalah sebagian dari iman.",
    sumber: "HR. Muslim",
  },
  {
    teks: "Senyummu di hadapan saudaramu adalah sedekah.",
    sumber: "HR. Tirmidzi",
  },
  {
    teks: "Barangsiapa menempuh jalan untuk mencari ilmu, Allah akan mudahkan baginya jalan menuju surga.",
    sumber: "HR. Muslim",
  },
  {
    teks: "Sedekah tidak akan mengurangi harta.",
    sumber: "HR. Muslim",
  },
  {
    teks: "Barangsiapa tidak menyayangi, maka ia tidak akan disayangi.",
    sumber: "HR. Bukhari dan Muslim",
  },
  {
    teks: "Jagalah (perintah) Allah, niscaya Allah akan menjagamu.",
    sumber: "HR. Tirmidzi",
  },
  {
    teks: "Mukmin yang kuat lebih baik dan lebih dicintai Allah daripada mukmin yang lemah.",
    sumber: "HR. Muslim",
  },
  {
    teks: "Bertakwalah kepada Allah di manapun engkau berada, iringilah keburukan dengan kebaikan niscaya kebaikan itu akan menghapusnya, dan pergaulilah manusia dengan akhlak yang baik.",
    sumber: "HR. Tirmidzi",
  },
  {
    teks: "Barangsiapa beriman kepada Allah dan hari akhir, hendaklah ia memuliakan tamunya.",
    sumber: "HR. Bukhari dan Muslim",
  },
  {
    teks: "Sesungguhnya Allah itu indah dan mencintai keindahan.",
    sumber: "HR. Muslim",
  },
  {
    teks: "Sebaik-baik kalian adalah yang paling baik akhlaknya.",
    sumber: "HR. Bukhari",
  },
  {
    teks: "Sebaik-baik manusia adalah yang paling bermanfaat bagi manusia lainnya.",
    sumber: "HR. Ahmad dan Ath-Thabrani",
  },
  {
    teks: "Barangsiapa memudahkan urusan orang lain yang kesulitan, Allah akan memudahkan urusannya di dunia dan akhirat.",
    sumber: "HR. Muslim",
  },
  {
    teks: "Dua kalimat yang ringan diucapkan lisan, berat dalam timbangan, dan dicintai Ar-Rahman: Subhanallahi wa bihamdihi, Subhanallahil 'Adzim.",
    sumber: "HR. Bukhari dan Muslim",
  },
  {
    teks: "Barangsiapa menunjukkan kepada suatu kebaikan, maka ia mendapat pahala seperti pahala orang yang mengerjakannya.",
    sumber: "HR. Muslim",
  },
  {
    teks: "Silaturahmi dapat memperpanjang umur dan memperluas rezeki.",
    sumber: "HR. Bukhari dan Muslim",
  },
];

/** Hari ke berapa dalam setahun (1-366) dari sebuah tanggal. */
function hariKeBerapa(date: Date): number {
  const awalTahun = new Date(date.getFullYear(), 0, 0);
  const selisihMs = date.getTime() - awalTahun.getTime();
  return Math.floor(selisihMs / 86_400_000);
}

/** Hadits yang tampil "hari ini" -- tetap sama sepanjang hari yang sama
 * (tidak berubah tiap kali halaman dimuat ulang), tapi otomatis ganti ke
 * hadits berikutnya di hari berikutnya (berputar lagi dari awal daftar
 * setelah 20 hari). */
export function haditsHariIni(date: Date = new Date()): Hadits {
  const idx = hariKeBerapa(date) % DAFTAR_HADITS.length;
  return DAFTAR_HADITS[idx];
}
