import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import PrayerTimesCard from "../components/PrayerTimesCard";
import KajianList from "../components/KajianList";
import InfaqCard from "../components/InfaqCard";
import SocialLinks from "../components/SocialLinks";

export default function Landing() {
  const { user } = useAuth();

  return (
    <div>
      <section className="bg-gradient-to-b from-primary-900 to-primary-700 text-white">
        <div className="max-w-6xl mx-auto px-4 py-16 text-center">
          <img src="/mosque.svg" className="h-16 w-16 mx-auto mb-4" alt="" />
          <h1 className="font-serif text-3xl sm:text-4xl font-bold mb-3">Mushalla Al Amanah</h1>
          <p className="text-white/80">GKN I Denpasar</p>
          <p className="max-w-xl mx-auto mt-4 text-white/80 text-sm sm:text-base">
            Melayani jamaah dengan jadwal shalat, kajian rutin, transparansi keuangan, dan bacaan
            Islami untuk warga GKN I Denpasar dan sekitarnya.
          </p>
          {!user && (
            <div className="mt-6 flex justify-center gap-3">
              <Link to="/register" className="btn-gold">
                Daftar Jamaah
              </Link>
              <Link to="/tentang" className="btn-secondary !bg-white/10 !text-white !border-white/30 hover:!bg-white/20">
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
        <InfaqCard />
        <div className="md:col-span-2">
          <SocialLinks />
        </div>
      </section>
    </div>
  );
}
