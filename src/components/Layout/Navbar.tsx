import { Link, NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../../context/AuthContext";

const links = [
  { to: "/", label: "Beranda" },
  { to: "/tentang", label: "Tentang" },
  { to: "/kalender", label: "Kalender" },
  { to: "/keuangan", label: "Laporan Keuangan" },
  { to: "/bacaan", label: "Bacaan" },
];

export default function Navbar() {
  const { user, profile, isAdmin, hasRole, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const canSeeDashboard = isAdmin || hasRole("bendahara") || hasRole("inventaris");

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <header className="bg-white text-gray-700 sticky top-0 z-40 border-b border-gray-100 shadow-sm pt-[max(20px,env(safe-area-inset-top))]">
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-2 font-serif font-bold text-lg">
          <img
            src={`${import.meta.env.BASE_URL}logo-al-amanah.png`}
            className="h-11 w-auto"
            alt="Logo Mushalla Al Amanah"
          />
        </Link>

        <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === "/"}
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-full transition-colors ${
                  isActive ? "bg-primary-50 text-primary-800" : "text-gray-600 hover:text-primary-700"
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <>
              {canSeeDashboard && (
                <Link to="/dashboard" className="btn-secondary">
                  Dashboard
                </Link>
              )}
              <Link to="/profil" className="text-sm text-gray-600 hover:text-primary-700">
                {profile?.full_name || "Profil"}
              </Link>
              <button onClick={handleLogout} className="btn-primary">
                Keluar
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-sm text-gray-600 hover:text-primary-700">
                Masuk
              </Link>
              <Link to="/register" className="btn-primary">
                Daftar
              </Link>
            </>
          )}
        </div>

        <button className="md:hidden text-gray-600" onClick={() => setOpen((o) => !o)} aria-label="Menu">
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {open && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 py-3 flex flex-col gap-3 text-sm">
          {links.map((l) => (
            <Link key={l.to} to={l.to} onClick={() => setOpen(false)} className="text-gray-600">
              {l.label}
            </Link>
          ))}
          {user ? (
            <>
              {canSeeDashboard && (
                <Link to="/dashboard" onClick={() => setOpen(false)} className="text-primary-700 font-medium">
                  Dashboard
                </Link>
              )}
              <Link to="/profil" onClick={() => setOpen(false)} className="text-gray-600">
                Profil ({profile?.full_name || "-"})
              </Link>
              <button onClick={handleLogout} className="text-left text-primary-700 font-medium">
                Keluar
              </button>
            </>
          ) : (
            <>
              <Link to="/login" onClick={() => setOpen(false)} className="text-gray-600">
                Masuk
              </Link>
              <Link to="/register" onClick={() => setOpen(false)} className="text-primary-700 font-medium">
                Daftar
              </Link>
            </>
          )}
        </div>
      )}
    </header>
  );
}
