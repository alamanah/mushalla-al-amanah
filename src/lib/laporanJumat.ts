import { LaporanKeuanganResult } from "./laporanKeuangan";
import { ZONA_WAKTU } from "./waktu";

function pad(n: number) {
  return n.toString().padStart(2, "0");
}
function toYMD(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Tanggal Jumat default saat membuka form Laporan Jumat -- Jumat ini
 * (dihitung dari tanggal "hari ini" versi WITA, BUKAN zona waktu
 * browser/server) kalau hari ini memang Jumat, atau Jumat terdekat
 * berikutnya kalau belum. */
export function tanggalJumatDefault(now: Date = new Date()): string {
  const witaStr = now.toLocaleString("en-US", { timeZone: ZONA_WAKTU });
  const wita = new Date(witaStr);
  const hari = wita.getDay(); // 0=Minggu ... 5=Jumat ... 6=Sabtu
  const selisih = (5 - hari + 7) % 7;
  wita.setDate(wita.getDate() + selisih);
  return toYMD(wita);
}

function formatAngka(n: number): string {
  return new Intl.NumberFormat("id-ID").format(Math.round(n));
}

/** "Pekan 38" -> "Pekan Ke-38" -- kalau nama periodenya tidak mengikuti pola
 * itu (custom), dipakai apa adanya. */
export function labelPeriodeJumat(periode: string): string {
  const m = periode.match(/^Pekan\s+(\d+)$/i);
  return m ? `Pekan Ke-${m[1]}` : periode;
}

export function formatTanggalJumatPanjang(tanggal: string): string {
  const [y, m, d] = tanggal.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

/** Rentang kode Unicode huruf Arab (termasuk tanda baca/harakat) -- dipakai
 * untuk mendeteksi baris mana di teks hasil generate yang perlu dirender
 * rata-kanan/RTL (mis. saat dijadikan PDF, lihat LaporanJumatModal.tsx). */
const ARABIC_RE = /[؀-ۿݐ-ݿࢠ-ࣿ]/;
export function isArabicLine(line: string): boolean {
  return ARABIC_RE.test(line);
}

/** Teks tetap "Pembaca Informasi" pada pengumuman Petugas Sholat Jumat --
 * lihat catatan di buildPetugasJumatText(). */
export const PEMBACA_INFORMASI_DEFAULT = "Pengurus DKM Al Amanah";

export interface LaporanJumatData {
  laporan: LaporanKeuanganResult;
  /** Tanggal Jumat yang laporannya dibuat, format "YYYY-MM-DD". */
  tanggalJumat: string;
  /** Tanggal Hijriah utk tanggalJumat, mis. "7 Rabiul Akhir 1448 H" (lihat
   * fetchHijriDateID) -- null kalau gagal diambil. */
  hijri: string | null;
  /** Jam sholat Jumat, format "HH:mm" (mis. dari prayer_schedule_override
   * kolom "jumat", atau dzuhur hari itu kalau belum ada koreksi khusus) --
   * null kalau belum termuat. */
  waktuJumat: string | null;
  namaKhotib: string | null;
  namaImam: string | null;
  namaMuadzin: string | null;
}

/**
 * Susun teks "Laporan Jumat" siap-tempel (mis. utk broadcast WhatsApp/dibaca
 * saat pengumuman sebelum khutbah) -- formatnya meniru kebiasaan pengumuman
 * mingguan yang sudah dipakai pengurus Mushalla Al Amanah. Bagian yang
 * berubah tiap minggu (laporan keuangan, petugas Jumat, jadwal shalat)
 * otomatis terisi dari data; bagian lain (pembukaan, pengingat infaq, agenda
 * rutin, tata tertib, penutup) berupa teks tetap yang tetap BISA diedit
 * bebas oleh penggunanya di textarea sebelum disalin (lihat
 * LaporanJumatModal.tsx) -- supaya tidak perlu ubah kode kalau kalimatnya
 * mau disesuaikan sewaktu-waktu.
 */
export function buildLaporanJumatText(data: LaporanJumatData): string {
  const { laporan, tanggalJumat, hijri, waktuJumat, namaKhotib, namaImam, namaMuadzin } = data;

  const periodeLabel = labelPeriodeJumat(laporan.periode);
  const perTanggal = formatTanggalJumatPanjang(laporan.tanggalTerakhir ?? tanggalJumat);
  const tanggalPanjang = formatTanggalJumatPanjang(tanggalJumat);
  const waktu = (waktuJumat ?? "12:00").replace(":", ".");

  const moneyLines: string[] = [];
  moneyLines.push(`   ● Saldo Awal : ${formatAngka(laporan.saldoAwal)}`);
  moneyLines.push(`   ● Penerimaan : ${formatAngka(laporan.totalPenerimaan)}`);
  laporan.penerimaan
    .filter((r) => r.jumlah > 0)
    .forEach((r) => moneyLines.push(`      ● ${formatAngka(r.jumlah)} ${r.kriteria}`));
  moneyLines.push(`   ● Pengeluaran : ${formatAngka(laporan.totalPengeluaran)}`);
  laporan.pengeluaran
    .filter((r) => r.jumlah > 0)
    .forEach((r) => moneyLines.push(`      ● ${formatAngka(r.jumlah)} ${r.kriteria}`));
  moneyLines.push(`   ● Saldo Akhir : ${formatAngka(laporan.saldoAkhir)}`);

  return `بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ
السَّلَامُ عَلَيْكُمْ وَرَحْمَةُ اللَّهِ وَبَرَكَاتُهُ

الْحَمْدُ لِلَّهِ وَالصَّلَاةُ وَالسَّلَامُ عَلَى رَسُولِ اللَّهِ وَعَلَى آلِهِ وَأَصْحَابِهِ وَمَنْ وَالَاهُ

Mohon perhatian Jama'ah rahimakumullah atas informasi yang akan kami sampaikan :

1. Yang pertama, kami mohon kesediaan jama'ah untuk menggeser kotak infaq ke sebelah kiri/selatan, dan infaq juga bisa disampaikan melalui QRIS yang ada di pintu-pintu masuk Mushola.

2. Yg ke-2, dapat kami sampaikan Laporan Keuangan Mushalla Al Amanah GKN I Denpasar Periode ${periodeLabel} (Per ${perTanggal})
${moneyLines.join("\n")}

Kepada Jama'ah yg sudah berinfaq kami sampaikan Jazakumullahu khairan katsir, semoga Allah menggantinya dengan yang lebih baik. Aamiin.

3. Yg ke-3, kami sampaikan Agenda Rutin Mushalla Al Amanah antara lain sbb:
   a. Kajian Rutin: Setiap Rabu (Ba'da Dzuhur);
   b. Kajian Tematik: Senin & Kamis (Ba'da Magrib) - Insya Allah semua kajian Live di Youtube Mushalla Al Amanah;
   c. Buka Puasa Sunnah: Senin & Kamis.

Mari jama'ah kita makmurkan mushalla kita ini. Semoga Allah memudahkan kita untuk meniti jalan menuju surga-Nya.

4. Selanjutnya yang bertugas pada Sholat Jum'at hari ini,
Jum'at${hijri ? `, ${hijri}` : ""} | ${tanggalPanjang} adalah sbb :
   ○ Khotib : ${namaKhotib || "-"}
   ○ Imam : ${namaImam || "-"}
   ○ Muadzin : ${namaMuadzin || "-"}

5. Demi kesempurnaan dan tertibnya ibadah sholat Jum'at, kami mohon :
   ○ Untuk segera memasuki Mushola dan mengisi shaf-shaf yang masih kosong, agar saudara-saudara kita yang belakangan hadir bisa mendapatkan tempat;
   ○ Mematikan HP selama pelaksanaan ibadah sholat Jum'at;
   ○ Mendengarkan khutbah dengan khusyu'; dan
   ○ Ketika khotib sudah naik mimbar mohon tidak melakukan hal-hal yang membuat sholat Jum'at menjadi sia-sia, antara lain bercakap-cakap dan bermain HP.

6. InSya Allah jadwal waktu sholat Jum'at hari ini pukul ${waktu} WITA.

Demikian, atas perhatiannya kami sampaikan, Jazakumullahu khairan katsir,

وَالسَّلَامُ عَلَيْكُمْ وَرَحْمَةُ اللَّهِ وَبَرَكَاتُهُ`;
}

export interface PetugasJumatData {
  /** Tanggal Jumat yang diumumkan, format "YYYY-MM-DD". */
  tanggalJumat: string;
  hijri: string | null;
  waktuJumat: string | null;
  namaKhotib: string | null;
  namaImam: string | null;
  namaMuadzin: string | null;
}

/**
 * Susun teks pengumuman singkat "Petugas Sholat Jumat" siap-tempel ke WA --
 * BEDA dari buildLaporanJumatText() di atas (yang isinya laporan keuangan
 * lengkap + agenda + tata tertib): ini cuma kabar singkat siapa yang
 * bertugas Jumat ini, meniru gaya pengumuman yang lazim dibagikan pengurus
 * DKM lain di grup WA (format *tebal* = format WhatsApp, jadi tercetak
 * tebal beneran begitu ditempel di WA). Baris "Pembaca Informasi" sengaja
 * berupa teks tetap (PEMBACA_INFORMASI_DEFAULT), tidak perlu diisi ulang
 * tiap minggu.
 */
export function buildPetugasJumatText(data: PetugasJumatData): string {
  const { tanggalJumat, hijri, waktuJumat, namaKhotib, namaImam, namaMuadzin } = data;
  const tanggalPanjang = formatTanggalJumatPanjang(tanggalJumat);
  const waktu = (waktuJumat ?? "12:00").replace(":", ".");

  return `السَّلَامُ عَلَيْكُمْ وَرَحْمَةُ اللَّهِ وَبَرَكَاتُهُ

Mohon izin share petugas sholat Jum'at di *Mushalla Al Amanah GKN I Denpasar* untuk *Hari Jum'at${
    hijri ? `, ${hijri}` : ""
  } | ${tanggalPanjang}*

*Khotib* :
*${namaKhotib || "-"}*

*Imam* :
*${namaImam || "-"}*

*Muadzin* :
*${namaMuadzin || "-"}*

*Pembaca Informasi* :
*${PEMBACA_INFORMASI_DEFAULT}*

*Dzuhur* : *${waktu} WITA*

Semoga menjadi amal jariyah dan semoga kita semua senantiasa diberikan kesehatan dan kebahagiaan serta keberkahan hidup, aamiin 🤲`;
}
