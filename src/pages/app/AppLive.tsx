import LiveScheduleList from "../../components/LiveScheduleList";

// Buka aplikasi YouTube biasa (bukan YouTube Studio) -- link youtube.com
// normal begini biasanya langsung diarahkan HP ke aplikasi YouTube kalau
// sudah terpasang (App Links di Android / Universal Links di iOS), bukan
// browser. Ini sengaja BEDA dari tombol "Mulai Live" di Dashboard (yang
// membuka studio.youtube.com) karena Studio lewat browser HP kadang error
// "Maaf, ada yang tidak beres", sedangkan live lewat aplikasi YouTube
// sendiri sudah terbukti lancar dipakai channel mushalla ini.
const YOUTUBE_APP_LIVE_URL = "https://m.youtube.com/live_dashboard";

/** Tab "Live" di halaman App/PWA (HP) -- isi & filter jadwalnya sama
 * persis dengan Dashboard > Live (cuma kajian & khutbah Jumat HARI INI),
 * lihat LiveScheduleList.tsx. Bedanya cuma tombol "Mulai Live" di sini
 * membuka aplikasi YouTube, bukan YouTube Studio. */
export default function AppLive() {
  return (
    <div>
      <h1 className="font-serif text-xl font-bold text-primary-900 mb-4">Live</h1>
      <LiveScheduleList liveUrl={YOUTUBE_APP_LIVE_URL} />
    </div>
  );
}
