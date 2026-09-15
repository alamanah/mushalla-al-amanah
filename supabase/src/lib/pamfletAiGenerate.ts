// Pamflet dibuat AI (Gemini) -- BEDA dari pamfletGenerator.ts (yang menggambar
// lewat <canvas>, teks dijamin akurat karena ditulis langsung oleh kode).
// Di sini, seluruh gambar (termasuk semua tulisan di dalamnya) dibuat oleh
// model AI Gemini lewat Google Apps Script (supaya API key-nya tidak pernah
// sampai ke browser pengunjung -- lihat komentar di google-apps-script/Code.gs
// bagian generateWithGemini_). KARENA model AI gambar bisa saja salah menulis
// angka/teks, hasilnya SELALU harus dipratinjau dulu (alur yang sama seperti
// pamflet template biasa) sebelum diupload ke Drive -- lihat pamfletPreview
// di Settings.tsx. Opsional: kalau Apps Script/GEMINI_API_KEY belum di-setup,
// fitur ini akan gagal dengan pesan error yang jelas (lihat SETUP.md bagian 7).

import { PamfletData } from "./pamfletGenerator";

/** Susun instruksi teks untuk Gemini -- semua data harus disebutkan APA
 * ADANYA (bukan dirangkum/diparafrase) supaya kemungkinan model salah tulis
 * seminimal mungkin, terutama untuk angka (rekening, nomor WA, tanggal). */
export function buildPamfletPrompt(data: PamfletData, template: "ornate" | "kajian-rutin"): string {
  const rekeningLines = data.rekening.length
    ? data.rekening.map((r) => `${r.bank_name}: ${r.account_number}${r.account_holder ? ` a.n. ${r.account_holder}` : ""}`).join("; ")
    : "(tidak ada rekening infaq aktif, jangan tampilkan bagian rekening)";
  const gaya =
    template === "ornate"
      ? "gaya elegan bingkai emas ganda dengan motif geometris Islami, latar gradasi biru navy tua ke gelap"
      : "gaya ilustrasi siluet masjid dengan kubah & menara di langit senja, palet warna hangat keemasan";

  return [
    "Buat SATU gambar poster/pamflet digital untuk kajian Islam di sebuah mushola, orientasi landscape (lebar x tinggi kira-kira 16:10).",
    `Gaya visual: ${gaya}, rapi, mudah dibaca, terasa islami dan hangat, cocok untuk mushola di Indonesia. Jangan gunakan foto orang sungguhan.`,
    "PENTING -- tuliskan teks berikut PERSIS seperti aslinya di dalam gambar, JANGAN mengubah, menyingkat, atau salah menulis satu huruf atau angka pun (terutama nomor rekening dan nomor WhatsApp harus persis sama):",
    `- Judul kajian: "${data.title}"`,
    data.ustadz ? `- Pemateri: "${data.ustadz}"` : null,
    `- Hari & tanggal: "${data.dateLabel}"${data.hijriLabel ? ` (${data.hijriLabel})` : ""}`,
    `- Waktu: "${data.timeText}"`,
    data.location ? `- Lokasi: "${data.location}"` : null,
    `- Rekening Infaq: ${rekeningLines}`,
    data.whatsapp ? `- Kontak/konfirmasi WhatsApp: "${data.whatsapp}"` : null,
    data.livePlatforms.length ? `- Live streaming lewat: ${data.livePlatforms.join(" & ")}` : null,
    `- Nama mushola (tampilkan di poster): "${data.orgName}"`,
    "Sertakan juga tulisan kaligrafi Arab Bismillah di bagian atas gambar.",
    "Susun semua teks di atas dengan rapi dan tetap terbaca jelas (kontras cukup dengan latar), jangan ada teks yang saling menumpuk atau terpotong.",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Balikin true kalau GAS upload endpoint sudah dikonfigurasi -- endpoint
 * yang sama juga dipakai untuk fitur "Buat dengan AI" ini (lewat action
 * "generate"), jadi tidak perlu env var terpisah. */
export function isPamfletAiConfigured(): boolean {
  return Boolean(import.meta.env.VITE_GAS_UPLOAD_URL);
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteChars = atob(base64);
  const byteNumbers = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    byteNumbers[i] = byteChars.charCodeAt(i);
  }
  return new Blob([new Uint8Array(byteNumbers)], { type: mimeType });
}

/** Minta Apps Script menggambar pamflet lewat Gemini AI dari data yang sama
 * dipakai oleh generatePamfletImage() (canvas) -- balikin Blob gambar yang
 * BELUM diupload ke Drive (dipratinjau dulu di Settings.tsx, sama seperti
 * alur template). */
export async function generatePamfletImageWithAI(data: PamfletData, template: "ornate" | "kajian-rutin"): Promise<Blob> {
  const url = import.meta.env.VITE_GAS_UPLOAD_URL as string;
  const token = (import.meta.env.VITE_GAS_UPLOAD_TOKEN as string | undefined) || "";
  const prompt = buildPamfletPrompt(data, template);

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      // Sengaja text/plain, lihat komentar di pamfletUpload.ts (postToGas)
      // -- alasan yang sama: menghindari preflight OPTIONS yang tidak
      // ditangani Google Apps Script Web App.
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ token, action: "generate", prompt }),
    });
  } catch {
    throw new Error("Tidak bisa menghubungi Google Apps Script. Periksa koneksi internet dan URL yang dikonfigurasi.");
  }
  if (!res.ok) {
    throw new Error(`Google Apps Script menolak permintaan (${res.status}).`);
  }
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  if (!json.image) throw new Error("Respons Apps Script tidak berisi gambar.");
  return base64ToBlob(json.image, json.mimeType || "image/png");
}
