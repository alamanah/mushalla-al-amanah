import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import PrayerTimesCard from "../components/PrayerTimesCard";
import KajianList from "../components/KajianList";
import KhatibJumatList from "../components/KhatibJumatList";
import InfaqCard from "../components/InfaqCard";
import SocialLinks from "../components/SocialLinks";

export default function Landing() {
  const { user } = useAuth();

  return (
    <div>
      <section className="bg-gradient-to-b from-primary-50 to-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-16 text-center">
          <img
            src={`${import.meta.env.BASE_URL}logo-al-amanah.png`}
            className="h-24 w-auto mx-auto mb-4"
            alt="Logo Mushalla Al Amanah"
          />
          <h1 className="font-serif text-3xl sm:text-4xl font-bold mb-3 text-primary-900">Mushalla Al Amanah</h1>
          <p className="text-gray-500">GKN I Denpasar</p>
          <p className="max-w-xl mx-auto mt-4 text-gray-500 text-sm sm:text-base">Bersama Menuju Allah</p>
          {!user && (
            <div className="mt-6 flex justify-center gap-3">
              <Link to="/register" className="btn-primary">
                Daftar Jamaah
              </Link>
              <Link to="/tentang" className="btn-secondary">
                Tentang Mushalla
              </Link>
            </div>
          )}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-10 grid md:grid-cols-2 gap-6">
        <div className="md:col-span-2">
          <PrayerTimesCard />
        </div>
        <KajianList />
        <KhatibJumatList />
        <div className="md:col-span-2">
          <InfaqCard />
        </div>
        <div className="md:col-span-2">
          <SocialLinks />
        </div>
      </section>
    </div>
  );
}
