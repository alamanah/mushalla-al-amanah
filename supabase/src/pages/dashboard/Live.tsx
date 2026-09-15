import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import LiveScheduleList from "../../components/LiveScheduleList";

/**
 * Live versi Dashboard (desktop) -- isi/filtering jadwalnya ada di
 * LiveScheduleList (dipakai bareng dengan halaman App/PWA di HP, lihat
 * AppLive.tsx), di sini cuma tambahan judul & link "Kelola Jadwal". Tombol
 * "Mulai Live" di sini pakai default LiveScheduleList (buka YouTube Studio)
 * karena halaman ini diakses dari komputer/laptop.
 */
export default function Live() {
  const { isAdmin, hasRole } = useAuth();
  const canEdit = isAdmin || hasRole("humas");

  if (!canEdit) {
    return (
      <div className="max-w-lg mx-auto mt-16 card text-center">
        <h2 className="text-lg font-semibold mb-2">Akses ditolak</h2>
        <p className="text-sm text-gray-600">Kamu tidak memiliki hak akses ke halaman ini.</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto pb-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-serif text-xl font-bold text-primary-900">Live</h1>
        <Link to="/dashboard/pengaturan" className="text-sm text-primary-700 hover:underline">
          Kelola Jadwal
        </Link>
      </div>

      <LiveScheduleList />
    </div>
  );
}
