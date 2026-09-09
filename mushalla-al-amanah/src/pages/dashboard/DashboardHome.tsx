import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabaseClient";

export default function DashboardHome() {
  const { profile, isAdmin, hasRole } = useAuth();
  const [pendingUsers, setPendingUsers] = useState(0);
  const [pendingArticles, setPendingArticles] = useState(0);

  useEffect(() => {
    if (isAdmin) {
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending")
        .then(({ count }) => setPendingUsers(count ?? 0));
      supabase
        .from("articles")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending")
        .then(({ count }) => setPendingArticles(count ?? 0));
    }
  }, [isAdmin]);

  return (
    <div>
      <h1 className="font-serif text-2xl font-bold text-primary-900 mb-1">
        Selamat datang, {profile?.full_name || "Pengurus"}
      </h1>
      <p className="text-sm text-gray-500 mb-6">Panel pengurus Mushalla Al Amanah GKN I Denpasar.</p>

      <div className="grid sm:grid-cols-2 gap-4">
        {isAdmin && (
          <Link to="/dashboard/verifikasi-user" className="card hover:shadow-md">
            <p className="text-xs text-gray-500">Menunggu Verifikasi</p>
            <p className="text-2xl font-bold text-primary-800">{pendingUsers} user</p>
          </Link>
        )}
        {isAdmin && (
          <Link to="/dashboard/artikel" className="card hover:shadow-md">
            <p className="text-xs text-gray-500">Artikel Menunggu Review</p>
            <p className="text-2xl font-bold text-primary-800">{pendingArticles} artikel</p>
          </Link>
        )}
        {(isAdmin || hasRole("bendahara")) && (
          <Link to="/dashboard/keuangan" className="card hover:shadow-md">
            <p className="font-medium text-gray-800">Kelola Keuangan</p>
            <p className="text-xs text-gray-400 mt-1">Catat pemasukan &amp; pengeluaran mushalla</p>
          </Link>
        )}
        {(isAdmin || hasRole("inventaris")) && (
          <Link to="/dashboard/inventaris" className="card hover:shadow-md">
            <p className="font-medium text-gray-800">Kelola Inventaris</p>
            <p className="text-xs text-gray-400 mt-1">Catat dan pantau aset mushalla</p>
          </Link>
        )}
        {isAdmin && (
          <Link to="/dashboard/pengaturan" className="card hover:shadow-md">
            <p className="font-medium text-gray-800">Pengaturan Konten</p>
            <p className="text-xs text-gray-400 mt-1">
              Jadwal kajian, info infaq, sosmed, profil mushalla, override jadwal shalat
            </p>
          </Link>
        )}
      </div>
    </div>
  );
}
