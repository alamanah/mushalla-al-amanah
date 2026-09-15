// Upload pamflet Kajian ke Google Drive lewat Google Apps Script (GAS) --
// jauh lebih sederhana buat pengurus dibanding OAuth Google Cloud Console
// (tidak perlu bikin OAuth consent screen / Client ID / tambah Test user,
// dan pengunjung dashboard tidak perlu login Google sendiri sama sekali --
// upload jalan di sisi server Google memakai akun yang deploy Apps
// Script-nya). Perlu VITE_GAS_UPLOAD_URL (+ VITE_GAS_UPLOAD_TOKEN, sangat
// disarankan diisi). Lihat supabase/SETUP.md bagian "Upload Pamflet
// otomatis ke Google Drive" dan file google-apps-script/Code.gs. Kalau
// VITE_GAS_UPLOAD_URL belum diisi, fitur ini nonaktif diam-diam -- form
// pamflet tetap bisa dipakai lewat tempel link manual.

export function isPamfletUploadConfigured(): boolean {
  return Boolean(import.meta.env.VITE_GAS_UPLOAD_URL);
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Hasil readAsDataURL berformat "data:<mime>;base64,<data>" -- ambil
      // bagian base64-nya saja, sisanya (mimeType) sudah dikirim terpisah.
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = () => reject(new Error("Gagal membaca file gambar."));
    reader.readAsDataURL(file);
  });
}

// Apps Script Web App merespons lewat redirect ke domain lain
// (script.googleusercontent.com) buat mengirim isi responsnya -- di sisi
// Google, doPost() SUDAH selesai dijalankan (file SUDAH masuk Drive) sebelum
// redirect itu terjadi, tapi kadang browser gagal membaca hasil redirect-nya
// (jaringan lambat/putus sesaat, dll), jadi fetch() melempar error padahal
// upload sebenarnya berhasil. Makanya di sini dicoba sekali lagi otomatis
// sebelum benar-benar menyerah -- aman diulang karena Code.gs mengecek dulu
// apakah file dengan nama yang sama sudah ada sebelum membuat yang baru,
// jadi tidak akan menghasilkan file dobel di Drive.
async function postToGas(url: string, body: string): Promise<Response> {
  const attempt = () =>
    fetch(url, {
      method: "POST",
      // Sengaja text/plain (bukan application/json) supaya browser tidak
      // mengirim preflight OPTIONS -- Google Apps Script Web App tidak
      // menanganinya, jadi upload akan gagal kalau preflight ikut terkirim.
      // Apps Script tetap mem-parse isinya sebagai JSON di sisi server.
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body,
    });
  try {
    return await attempt();
  } catch (firstErr) {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    try {
      return await attempt();
    } catch {
      throw firstErr;
    }
  }
}

/** Tambah akhiran acak+waktu ke nama file supaya nyaris pasti unik --
 * penting karena Code.gs (sisi Google) memakai NAMA FILE untuk mendeteksi
 * upload yang sudah pernah berhasil (lihat komentar di postToGas). Kalau
 * nama file dipakai apa adanya (mis. dua orang sama-sama upload
 * "IMG_1234.jpg"), foto yang beda bisa salah dianggap "sudah pernah
 * diupload" dan malah balik link foto orang lain. */
function uniqueFilename(originalName: string): string {
  const dot = originalName.lastIndexOf(".");
  const base = dot > 0 ? originalName.slice(0, dot) : originalName;
  const ext = dot > 0 ? originalName.slice(dot) : "";
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `${base}-${stamp}${ext}`;
}

/** Upload satu file gambar pamflet lewat Google Apps Script Web App --
 * balikin link Drive-nya (siap dipakai langsung, kompatibel dengan
 * driveImageUrl() di src/lib/driveLink.ts). */
export async function uploadPamfletToDrive(file: File): Promise<string> {
  const url = import.meta.env.VITE_GAS_UPLOAD_URL as string;
  const token = (import.meta.env.VITE_GAS_UPLOAD_TOKEN as string | undefined) || "";
  const data = await fileToBase64(file);
  const filename = uniqueFilename(file.name);

  let res: Response;
  try {
    res = await postToGas(url, JSON.stringify({ token, filename, mimeType: file.type, data }));
  } catch {
    throw new Error("Tidak bisa menghubungi Google Apps Script. Periksa koneksi internet dan URL yang dikonfigurasi.");
  }
  if (!res.ok) {
    throw new Error(`Google Apps Script menolak permintaan (${res.status}).`);
  }
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  if (!json.url) throw new Error("Respons Apps Script tidak berisi link file.");
  return json.url as string;
}
