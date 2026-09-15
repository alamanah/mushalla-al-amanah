// Deteksi otomatis video YouTube yang sedang LIVE di channel Mushalla Al
// Amanah (alamanahgknidenpasar@gmail.com), via YouTube Data API v3.
// Perlu VITE_YOUTUBE_API_KEY & VITE_YOUTUBE_CHANNEL_ID (lihat supabase/SETUP.md
// bagian "Live YouTube otomatis"). Kalau belum diisi, fitur ini nonaktif diam-diam
// (tombol Live tetap bisa dipakai untuk buka YouTube Studio, hanya deteksi
// otomatisnya yang tidak jalan).

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
