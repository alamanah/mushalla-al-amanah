import { Outlet } from "react-router-dom";
import AppBottomNav from "./AppBottomNav";

/**
 * Layout untuk halaman App/PWA (/app/...) -- terpisah dari DashboardLayout
 * (dipakai buat /dashboard/...). Sengaja dibuat minim (cuma header kecil +
 * bottom nav, tanpa sidebar/topbar penuh seperti Dashboard) karena memang
 * ditujukan sebagai tampilan ringkas gaya aplikasi HP untuk aksi
 * sehari-hari (live, rekam inventaris, rekam transaksi) -- bukan untuk
 * melihat laporan/daftar lengkap (itu tetap lewat Dashboard di desktop).
 * Login TETAP lewat halaman /login yang sama (ProtectedRoute di App.tsx
 * yang mengarahkan ke sana kalau belum login), tidak ada halaman login
 * terpisah untuk /app.
 */
export default function AppLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="shrink-0 bg-white border-b border-gray-100 flex items-center gap-2 px-4 h-14 pt-[env(safe-area-inset-top)] sticky top-0 z-20">
        <img
          src={`${import.meta.env.BASE_URL}logo-al-amanah.png`}
          className="h-8 w-auto"
          alt="Logo Mushalla Al Amanah"
        />
        <span className="font-serif font-bold text-primary-900 text-sm truncate">Mushalla Al Amanah</span>
      </header>
      <div className="flex-1 overflow-y-auto pb-20">
        <div className="p-4">
          <Outlet />
        </div>
      </div>
      <AppBottomNav />
    </div>
  );
}
