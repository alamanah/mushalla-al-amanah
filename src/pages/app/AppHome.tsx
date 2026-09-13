import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

/** Halaman index /app -- langsung arahkan ke tab pertama yang relevan
 * sesuai role user (urutan sama seperti bottom nav: Live, lalu Inventaris,
 * lalu Keuangan), atau ke Profil kalau tidak pegang role apa pun. */
export default function AppHome() {
  const { isAdmin, hasRole } = useAuth();

  if (isAdmin || hasRole("humas")) return <Navigate to="/app/live" replace />;
  if (hasRole("inventaris")) return <Navigate to="/app/inventaris" replace />;
  if (hasRole("bendahara")) return <Navigate to="/app/keuangan" replace />;
  return <Navigate to="/app/profil" replace />;
}
