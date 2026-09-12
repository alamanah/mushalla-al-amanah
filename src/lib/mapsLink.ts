/** Bikin URL embed Google Maps (iframe) langsung dari teks alamat -- tidak
 * perlu API key Google sama sekali (endpoint "output=embed" ini gratis &
 * publik). Dipakai untuk peta di halaman Tentang & footer. */
export function mapsEmbedUrl(address: string): string {
  return `https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`;
}

/** URL tombol "Buka di Google Maps" -- pakai link yang ditempel admin kalau
 * ada (paling akurat, mis. hasil "Bagikan" dari Google Maps), kalau belum
 * diisi jatuh ke pencarian alamat biasa di Google Maps. */
export function mapsOpenUrl(address: string, mapsUrl?: string | null): string {
  return mapsUrl?.trim() || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}
