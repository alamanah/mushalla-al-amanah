import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
      <path d="M3 11.5 12 4l9 7.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function WalletIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
      <rect x="3" y="6" width="18" height="13" rx="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 10h18" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="16" cy="14.5" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}
function BoxIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
      <path d="M21 8 12 3 3 8l9 5 9-5Z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 8v8l9 5 9-5V8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 13v8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function MoreIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
      <circle cx="5" cy="12" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="19" cy="12" r="1.8" />
    </svg>
  );
}
function LiveIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
      <rect x="3" y="6" width="13" height="12" rx="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m16 10.5 5-3v9l-5-3Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4">
      <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
    </svg>
  );
}

interface MoreItem {
  to: string;
  label: string;
}

export default function BottomNav({ moreItems }: { moreItems: MoreItem[] }) {
  const { profile, isAdmin, hasRole, signOut } = useAuth();
  const navigate = useNavigate();
  const [showMore, setShowMore] = useState(false);

  // Menu bawah di HP fokus untuk AKSI (rekam data), bukan untuk melihat
  // laporan/daftar lengkap -- jadi hanya ditampilkan untuk pemegang role
  // terkait (bukan admin yang read-only). Untuk lihat data lengkap, admin
  // tetap bisa lewat menu "Lainnya".
  const canBendahara = hasRole("bendahara");
  const canInventaris = hasRole("inventaris");
  const canLiveKajian = isAdmin || hasRole("humas");

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5 text-[11px] ${
      isActive ? "text-primary-700" : "text-gray-400"
    }`;

  return (
    <>
      {showMore && (
        <div className="fixed inset-0 z-40 sm:hidden" onClick={() => setShowMore(false)}>
          <div className="absolute inset-0 bg-black/30" />
          <div
            className="absolute bottom-16 left-0 right-0 bg-white rounded-t-2xl border-t border-gray-100 shadow-lg p-3 pb-[env(safe-area-inset-bottom)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-2 pb-2">
              <span className="text-sm font-semibold text-gray-700">Menu Lainnya</span>
              <button onClick={() => setShowMore(false)} className="p-1 text-gray-400">
                <CloseIcon />
              </button>
            </div>
            <div className="flex flex-col">
              <Link
                to="/profil"
                onClick={() => setShowMore(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 text-sm text-gray-700"
              >
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="h-6 w-6 rounded-full object-cover" />
                ) : (
                  <span className="h-6 w-6 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-semibold">
                    {(profile?.full_name ?? "?").charAt(0).toUpperCase()}
                  </span>
                )}
                {profile?.full_name ?? "Akun Saya"}
              </Link>
              {moreItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setShowMore(false)}
                  className="px-3 py-2.5 rounded-lg hover:bg-gray-50 text-sm text-gray-700"
                >
                  {item.label}
                </Link>
              ))}
              <button
                onClick={handleLogout}
                className="text-left px-3 py-2.5 rounded-lg hover:bg-gray-50 text-sm text-red-600"
              >
                Keluar
              </button>
            </div>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 inset-x-0 z-30 sm:hidden bg-white border-t border-gray-100 pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-stretch">
          <NavLink to="/dashboard" end className={linkClass}>
            <HomeIcon />
            Ringkasan
          </NavLink>
          {canBendahara && (
            <NavLink to="/dashboard/keuangan/rekam" className={linkClass}>
              <WalletIcon />
              Keuangan
            </NavLink>
          )}
          {canLiveKajian && (
            <NavLink to="/dashboard/kajian-live" className={linkClass}>
              <LiveIcon />
              Live
            </NavLink>
          )}
          {canInventaris && (
            <NavLink to="/dashboard/inventaris/tambah" className={linkClass}>
              <BoxIcon />
              Inventaris
            </NavLink>
          )}
          <button onClick={() => setShowMore(true)} className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5 text-[11px] text-gray-400">
            <MoreIcon />
            Lainnya
          </button>
        </div>
      </nav>
    </>
  );
}
