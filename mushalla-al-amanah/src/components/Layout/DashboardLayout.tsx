import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function DashboardLayout() {
  const { profile, isAdmin, hasRole, signOut } = useAuth();
  const navigate = useNavigate();

  const items = [
    { to: "/dashboard", label: "Ringkasan", end: true, show: true },
    { to: "/dashboard/verifikasi-user", label: "Verifikasi User", show: isAdmin },
    { to: "/dashboard/artikel", label: "Moderasi Artikel", show: isAdmin },
    { to: "/dashboard/keuangan", label: "Keuangan", show: isAdmin || hasRole("bendahara") },
    { to: "/dashboard/inventaris", label: "Inventaris", show: isAdmin || hasRole("inventaris") },
    { to: "/dashboard/pengaturan", label: "Pengaturan Konten", show: isAdmin },
  ];

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      <aside className="w-60 bg-primary-950 text-white flex flex-col shrink-0">
        <Link to="/" className="flex items-center gap-2 px-4 h-16 border-b border-white/10 font-serif font-bold">
          <img src="/mosque.svg" className="h-7 w-7" alt="" />
          Al Amanah
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
        <div className="p-3 border-t border-white/10 text-xs text-white/60">
          <p className="mb-2">{profile?.full_name}</p>
          <button onClick={handleLogout} className="text-gold-400 hover:underline">
            Keluar
          </button>
        </div>
      </aside>
      <div className="flex-1 min-w-0">
        <div className="max-w-5xl mx-auto p-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
