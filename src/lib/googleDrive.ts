// Upload pamflet Kajian langsung ke Google Drive (folder "Pamflet") dari
// browser, tanpa server tambahan -- pakai Google Identity Services (OAuth
// token client) + Google Drive API v3. Perlu VITE_GOOGLE_CLIENT_ID (lihat
// supabase/SETUP.md bagian "Upload Pamflet otomatis ke Google Drive"). Kalau
// belum diisi, fitur ini nonaktif diam-diam -- form pamflet tetap bisa
// dipakai lewat tempel link manual.

const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
const FOLDER_NAME = "Pamflet";

interface TokenClient {
  requestAccessToken: (opts: { prompt: string }) => void;
}
interface GoogleAccountsOAuth2 {
  initTokenClient: (config: {
    client_id: string;
    scope: string;
    callback: (resp: { access_token?: string; expires_in?: string | number; error?: string }) => void;
    error_callback?: (err: { message?: string }) => void;
  }) => TokenClient;
}
declare global {
  interface Window {
    google?: { accounts?: { oauth2?: GoogleAccountsOAuth2 } };
  }
}

let gisScriptPromise: Promise<void> | null = null;
let cachedToken: { token: string; expiresAt: number } | null = null;
let cachedFolderId: string | null = null;

export function isGoogleDriveConfigured(): boolean {
  return Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);
}

function loadGisScript(): Promise<void> {
  if (gisScriptPromise) return gisScriptPromise;
  gisScriptPromise = new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Gagal memuat layanan login Google. Periksa koneksi internet."));
    document.head.appendChild(script);
  });
  return gisScriptPromise;
}

/** Minta access token OAuth (scope drive.file) -- akan memunculkan jendela
 * login/izin Google kalau belum ada token yang masih berlaku di memori.
 * HARUS dipanggil dari dalam alur event klik pengguna (mis. handler onChange
 * file input yang dipicu tombol), supaya jendela popup-nya tidak diblokir
 * browser. */
async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30000) {
    return cachedToken.token;
  }
  await loadGisScript();
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;
  return new Promise((resolve, reject) => {
    const client = window.google!.accounts!.oauth2!.initTokenClient({
      client_id: clientId,
      scope: DRIVE_SCOPE,
      callback: (resp) => {
        if (resp.error || !resp.access_token) {
          reject(new Error(resp.error || "Login Google gagal."));
          return;
        }
        cachedToken = { token: resp.access_token, expiresAt: Date.now() + (Number(resp.expires_in) || 3000) * 1000 };
        resolve(resp.access_token);
      },
      error_callback: (err) => reject(new Error(err?.message || "Login Google dibatalkan.")),
    });
    client.requestAccessToken({ prompt: "consent" });
  });
}

async function driveFetch(token: string, url: string, init: RequestInit = {}) {
  const res = await fetch(url, {
    ...init,
    headers: { ...(init.headers || {}), Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Google Drive menolak permintaan (${res.status}). ${text}`.trim());
  }
  return res.json();
}

/** Cari folder "Pamflet" di Drive akun yang login; buat baru kalau belum ada. */
async function findOrCreateFolder(token: string): Promise<string> {
  if (cachedFolderId) return cachedFolderId;
  const q = encodeURIComponent(
    `name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
  );
  const searchRes = await driveFetch(
    token,
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)&spaces=drive`
  );
  const found = searchRes.files?.[0]?.id as string | undefined;
  if (found) {
    cachedFolderId = found;
    return found;
  }
  const created = await driveFetch(token, "https://www.googleapis.com/drive/v3/files?fields=id", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: FOLDER_NAME, mimeType: "application/vnd.google-apps.folder" }),
  });
  cachedFolderId = created.id as string;
  return cachedFolderId;
}

async function uploadFile(token: string, file: File, folderId: string): Promise<string> {
  const metadata = { name: `${Date.now()}-${file.name}`, parents: [folderId] };
  const form = new FormData();
  form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
  form.append("file", file);
  const res = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) throw new Error(`Gagal mengunggah file ke Google Drive (${res.status}).`);
  const json = await res.json();
  return json.id as string;
}

async function makeFilePublic(token: string, fileId: string) {
  await driveFetch(token, `https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role: "reader", type: "anyone" }),
  });
}

/** Alur lengkap upload pamflet: login Google (kalau perlu) -> cari/buat
 * folder "Pamflet" -> unggah file -> set akses "siapa saja yang punya link"
 * -> balikin link Drive-nya (siap dipakai langsung, kompatibel dengan
 * driveImageUrl() di src/lib/driveLink.ts). */
export async function uploadPamfletToDrive(file: File): Promise<string> {
  const token = await getAccessToken();
  const folderId = await findOrCreateFolder(token);
  const fileId = await uploadFile(token, file, folderId);
  await makeFilePublic(token, fileId);
  return `https://drive.google.com/file/d/${fileId}/view`;
}
