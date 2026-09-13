import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

// Ikon-ikon di bawah ini sengaja diduplikasi (bukan di-share) dari
// BottomNav.tsx (Live/Wallet/Box) mengikuti gaya kode yang sudah ada di
// proyek ini -- tiap file layout punya ikon lokalnya sendiri.
function LiveIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
      <rect x="3" y="6" width="13" height="12" rx="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m16 10.5 5-3v9l-5-3Z" strokeLinecap="round" strokeLinejoin="round" />
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
function WalletIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
      <rect x="3" y="6" width="18" height="13" rx="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 10h18" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="16" cy="14.5" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}
function ProfileIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
      <circle cx="12" cy="8" r="3.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4.5 20c1.2-3.5 4.2-5.5 7.5-5.5s6.3 2 7.5 5.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
      <path d="M9 4H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 8l4 4-4 4M18 12H9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Bottom nav untuk halaman App/PWA (/app/...) -- terpisah dari BottomNav.tsx
 * milik Dashboard (beda urutan & isi menu, dan selalu tampil di semua
 * ukuran layar karena halaman App tidak punya sidebar alternatif untuk
 * layar besar seperti Dashboard). Urutan tetap: Live | Inventaris |
 * Keuangan | Profil | Keluar -- 3 yang pertama ikut role user (kalau tidak
 * pegang role apa pun, cuma Profil & Keluar yang tampil).
 */
export default function AppBottomNav() {
  const { isAdmin, hasRole, signOut } = useAuth();
  const navigate = useNavigate();

  // Sama persis dengan aturan akses rute /dashboard/live, /dashboard/keuangan/rekam
  // & /dashboard/inventaris/tambah (lihat App.tsx) supaya menu yang tampil
  // di sini selalu cocok dengan yang benar-benar bisa diakses.
  const canLive = isAdmin || hasRole("humas");
  const canKeuangan = hasRole("bendahara");
  const canInventaris = hasRole("inventaris");

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5 text-[11px] ${
      isActive ? "text-primary-700" : "text-gray-400"
    }`;

  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 bg-white border-t border-gray-100 pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-md mx-auto flex items-stretch">
        {canLive && (
          <NavLink to="/app/live" className={linkClass}>
            <LiveIcon />
            Live
          </NavLink>
        )}
        {canInventaris && (
          <NavLink to="/app/inventaris" className={linkClass}>
            <BoxIcon />
            Inventaris
          </NavLink>
        )}
        {canKeuangan && (
          <NavLink to="/app/keuangan" className={linkClass}>
            <WalletIcon />
            Keuangan
          </NavLink>
        )}
        <NavLink to="/app/profil" className={linkClass}>
          <ProfileIcon />
          Profil
        </NavLink>
        <button onClick={handleLogout} className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5 text-[11px] text-gray-400">
          <LogoutIcon />
          Keluar
        </button>
      </div>
    </nav>
  );
}
