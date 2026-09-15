import { Navigate } from "react-router-dom";
import { ReactNode } from "react";
import { useAuth } from "../context/AuthContext";
import { AppRole } from "../types";

interface Props {
  children: ReactNode;
  roles?: AppRole[]; // jika diisi, harus admin ATAU punya salah satu role ini
  requireApproved?: boolean;
}

export default function ProtectedRoute({ children, roles, requireApproved = true }: Props) {
  const { user, profile, loading, isAdmin, hasRole } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24 text-gray-500">Memuat...</div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requireApproved && profile?.status !== "approved" && !isAdmin) {
    return (
      <div className="max-w-lg mx-auto mt-16 card text-center">
        <h2 className="text-lg font-semibold mb-2">Akun belum diverifikasi</h2>
        <p className="text-sm text-gray-600">
          Akun kamu masih menunggu verifikasi oleh admin Mushalla Al Amanah. Silakan cek kembali
          nanti, atau hubungi pengurus mushalla.
        </p>
      </div>
    );
  }

  if (roles && roles.length > 0 && !isAdmin && !roles.some((r) => hasRole(r))) {
    return (
      <div className="max-w-lg mx-auto mt-16 card text-center">
        <h2 className="text-lg font-semibold mb-2">Akses ditolak</h2>
        <p className="text-sm text-gray-600">Kamu tidak memiliki hak akses ke halaman ini.</p>
      </div>
    );
  }

  return <>{children}</>;
}
