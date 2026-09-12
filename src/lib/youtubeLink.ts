/** Tautan YouTube "final" untuk satu jadwal Kajian/Khatib -- utamakan video
 * yang SEDANG live (live_video_id, auto terdeteksi), baru pakai link
 * manual (link_youtube) kalau sedang tidak live. null kalau keduanya
 * kosong (dipakai buat munculkan notifikasi "Link belum tersedia"). */
export function resolveYoutubeLink(item: { live_video_id: string | null; link_youtube: string | null }): string | null {
  if (item.live_video_id) return `https://www.youtube.com/watch?v=${item.live_video_id}`;
  return item.link_youtube || null;
}

/** Buka link YouTube di tab baru -- kalau belum ada link-nya, kasih tahu
 * lewat notifikasi sederhana daripada diam saja tidak terjadi apa-apa. */
export function openYoutubeLink(link: string | null) {
  if (!link) {
    alert("Link belum tersedia.");
    return;
  }
  window.open(link, "_blank", "noopener");
}
