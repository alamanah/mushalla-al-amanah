// Integrasi YouTube Data API v3 utk channel Mushalla Al Amanah
// (alamanahgknidenpasar@gmail.com) -- dipakai utk (1) deteksi otomatis video
// yang sedang LIVE (dashboard/HP > Live, lihat useKajianLive.ts), dan (2)
// mencari video yang di-upload pada tanggal tertentu (Dashboard > Live >
// "Ambil Link", lihat findVideosByDate di bawah). Perlu VITE_YOUTUBE_API_KEY
// & VITE_YOUTUBE_CHANNEL_ID (lihat supabase/SETUP.md bagian "Live YouTube
// otomatis"). Kalau belum diisi, fitur-fitur ini nonaktif diam-diam.

import { ZONA_WAKTU } from "./waktu";

export function isYoutubeLiveConfigured(): boolean {
  return Boolean(import.meta.env.VITE_YOUTUBE_API_KEY && import.meta.env.VITE_YOUTUBE_CHANNEL_ID);
}

/** Cari video yang SEDANG live di channel yang dikonfigurasi. Return video ID
 * YouTube-nya, atau null kalau tidak ada yang live / API belum dikonfigurasi /
 * terjadi error (mis. kuota API habis). */
export async function findLiveVideoId(): Promise<string | null> {
  const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY as string | undefined;
  const channelId = import.meta.env.VITE_YOUTUBE_CHANNEL_ID as string | undefined;
  if (!apiKey || !channelId) return null;

  try {
    const url =
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&eventType=live` +
      `&channelId=${encodeURIComponent(channelId)}&key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    const videoId = json.items?.[0]?.id?.videoId;
    return typeof videoId === "string" ? videoId : null;
  } catch {
    return null;
  }
}

export interface YoutubeVideoCandidate {
  videoId: string;
  title: string;
  /** ISO timestamp (UTC) kapan videonya di-upload/dipublikasikan. */
  publishedAt: string;
}

function tanggalWitaDari(iso: string): string {
  const d = new Date(iso);
  const witaStr = d.toLocaleString("en-US", { timeZone: ZONA_WAKTU });
  const wita = new Date(witaStr);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${wita.getFullYear()}-${pad(wita.getMonth() + 1)}-${pad(wita.getDate())}`;
}

// Playlist "Uploads" (berisi SEMUA video channel) jarang berubah selama
// sesi berjalan -- di-cache di memori supaya tidak perlu request ulang
// tiap kali admin klik "Ambil Link" utk jadwal yang berbeda.
let uploadsPlaylistIdCache: string | null | undefined;

async function getUploadsPlaylistId(apiKey: string, channelId: string): Promise<string | null> {
  if (uploadsPlaylistIdCache !== undefined) return uploadsPlaylistIdCache;
  try {
    const url =
      `https://www.googleapis.com/youtube/v3/channels?part=contentDetails` +
      `&id=${encodeURIComponent(channelId)}&key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url);
    if (!res.ok) {
      uploadsPlaylistIdCache = null;
      return null;
    }
    const json = await res.json();
    const id = json.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
    uploadsPlaylistIdCache = typeof id === "string" ? id : null;
    return uploadsPlaylistIdCache;
  } catch {
    uploadsPlaylistIdCache = null;
    return null;
  }
}

/**
 * Cari video yang di-upload/dipublikasikan pada `tanggal` tertentu (format
 * "YYYY-MM-DD", dicocokkan di zona WITA) di channel yang dikonfigurasi --
 * dipakai Dashboard > Live > "Ambil Link" supaya admin tidak perlu menyalin
 * link video secara manual dari YouTube Studio, cukup berdasarkan tanggal
 * kajian/khutbahnya. Menelusuri playlist "Uploads" channel (BUKAN endpoint
 * `search`) karena hasilnya lebih konsisten/langsung muncul begitu
 * di-upload dan jauh lebih hemat kuota API. Menelusuri beberapa halaman
 * terbaru saja (playlist ini terurut dari yang paling baru) dan berhenti
 * lebih awal begitu ketemu video yang tanggalnya sudah lebih lama dari yang
 * dicari -- jadi cukup cepat utk kajian/khutbah yang videonya baru-baru ini
 * diunggah. Return array kosong kalau API belum dikonfigurasi, tidak ada
 * yang cocok, atau terjadi error.
 */
export async function findVideosByDate(tanggal: string): Promise<YoutubeVideoCandidate[]> {
  const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY as string | undefined;
  const channelId = import.meta.env.VITE_YOUTUBE_CHANNEL_ID as string | undefined;
  if (!apiKey || !channelId) return [];

  const playlistId = await getUploadsPlaylistId(apiKey, channelId);
  if (!playlistId) return [];

  const matches: YoutubeVideoCandidate[] = [];
  const MAX_PAGES = 4; // ~200 video terakhir -- cukup utk jadwal mingguan
  let pageToken: string | undefined;

  try {
    for (let page = 0; page < MAX_PAGES; page++) {
      const url =
        `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50` +
        `&playlistId=${encodeURIComponent(playlistId)}&key=${encodeURIComponent(apiKey)}` +
        (pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : "");
      const res = await fetch(url);
      if (!res.ok) break;
      const json = await res.json();
      const items = (json.items ?? []) as {
        snippet?: { title?: string; publishedAt?: string; resourceId?: { videoId?: string } };
      }[];

      for (const item of items) {
        const publishedAt = item.snippet?.publishedAt;
        const videoId = item.snippet?.resourceId?.videoId;
        if (!publishedAt || !videoId) continue;
        if (tanggalWitaDari(publishedAt) === tanggal) {
          matches.push({ videoId, title: item.snippet?.title ?? "(tanpa judul)", publishedAt });
        }
      }

      const oldest = items[items.length - 1]?.snippet?.publishedAt;
      if (items.length === 0 || (oldest && tanggalWitaDari(oldest) < tanggal)) break;
      pageToken = json.nextPageToken;
      if (!pageToken) break;
    }
  } catch {
    // Kembalikan apa yang sudah ketemu sejauh ini kalau request gagal
    // di tengah jalan (mis. kuota habis) -- lebih baik daripada kosong sama
    // sekali padahal sudah ada hasil dari halaman sebelumnya.
  }

  return matches;
}
