import PrayerTimesCard from "../components/PrayerTimesCard";
import BacaanList from "../components/BacaanList";
import KajianList from "../components/KajianList";
import KhatibJumatList from "../components/KhatibJumatList";
import InfaqCard from "../components/InfaqCard";

// Header besar (logo + nama mushalla) sengaja dihilangkan -- sudah ada di
// Navbar, jadi tidak perlu diulang di sini. Section-section beranda dibuat
// transparan (bukan kotak/card putih) supaya menyatu dengan latar halaman,
// dipisahkan garis tipis antar section saja.
export default function Landing() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <BacaanList />
      <PrayerTimesCard />

      <div className="grid md:grid-cols-2 md:divide-x md:divide-gray-200 border-t border-gray-100 mt-8 pt-8">
        <div className="md:pr-8">
          <KajianList />
        </div>
        <div className="md:pl-8 mt-8 md:mt-0">
          <KhatibJumatList />
        </div>
      </div>

      <div className="border-t border-gray-100 mt-8 pt-8">
        <InfaqCard />
      </div>
    </div>
  );
}
