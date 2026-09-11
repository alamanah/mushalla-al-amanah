import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import BottomNav from "./BottomNav";

export default function DashboardLayout() {
  const { profile, isAdmin, hasRole, signOut } = useAuth();
  const navigate = useNavigate();

  const items = [
    { to: "/dashboard", label: "Ringkasan", end: true, show: true },
    { to: "/dashboard/verifikasi-user", label: "Verifikasi User", show: isAdmin },
    { to: "/dashboard/referensi", label: "Referensi", show: isAdmin },
    { to: "/dashboard/artikel", label: "Moderasi Artikel", show: isAdmin },
    { to: "/dashboard/keuangan", label: "Keuangan", show: isAdmin || hasRole("bendahara") },
    { to: "/dashboard/inventaris", label: "Inventaris", show: isAdmin || hasRole("inventaris") },
    { to: "/dashboard/pengaturan", label: "Pengaturan Konten", show: isAdmin || hasRole("humas") },
    { to: "/dashboard/kajian-live", label: "Live Kajian", show: isAdmin || hasRole("humas") },
  ];

  // Bottom nav (mobile) sekarang berisi shortcut AKSI (rekam transaksi/barang,
  // mulai live) sesuai role, jadi menu "Lainnya" memuat semua menu dashboard
  // selain Ringkasan (termasuk Keuangan & Inventaris versi lengkap untuk lihat
  // data, dan Live Kajian dobel-tampil sengaja tidak masalah karena label beda).
  const moreItems = items
    .filter((i) => i.show && i.to !== "/dashboard" && i.to !== "/dashboard/kajian-live")
    .map((i) => ({ to: i.to, label: i.label }));

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      <aside className="hidden sm:flex w-60 bg-primary-950 text-white flex-col shrink-0">
        <Link to="/" className="flex items-center gap-2 px-4 h-16 border-b border-white/10 font-serif font-bold">
          <img
            src={`${import.meta.env.BASE_URL}logo-al-amanah.png`}
            className="h-10 w-auto rounded bg-white p-1"
            alt="Logo Mushalla Al Amanah"
          />
        </Link>
        <nav className="flex-1 py-4 flex flex-col gap-1 px-2 text-sm">
          {items
            .filter((i) => i.show)
            .map((i) => (
              <NavLink
                key={i.to}
                to={i.to}
                end={i.end}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 transition-colors ${
                    isActive ? "bg-primary-700 text-white" : "text-white/70 hover:bg-white/10"
                  }`
                }
              >
                {i.label}
              </NavLink>
            ))}
        </nav>
      </aside>
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="shrink-0 bg-white border-b border-gray-100 flex items-center justify-end gap-3 px-6 min-h-16 pt-[max(20px,env(safe-area-inset-top))]">
          <Link
            to="/profil"
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-primary-700 min-w-0"
          >
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt=""
                className="h-8 w-8 rounded-full object-cover border border-gray-200 shrink-0"
              />
            ) : (
              <span className="h-8 w-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-semibold shrink-0">
                {(profile?.full_name ?? "?").charAt(0).toUpperCase()}
              </span>
            )}
            <span className="hidden sm:inline font-medium truncate max-w-[140px]">
              {profile?.full_name ?? "Akun Saya"}
            </span>
          </Link>
          <button onClick={handleLogout} className="btn-secondary text-sm">
            Keluar
          </button>
        </header>
        <div className="flex-1 overflow-y-auto pb-20 sm:pb-0">
          <div className="max-w-7xl mx-auto p-6">
            <Outlet />
          </div>
        </div>
      </div>
      <BottomNav moreItems={moreItems} />
    </div>
  );
}
