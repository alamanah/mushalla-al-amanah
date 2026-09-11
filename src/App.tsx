import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import PublicLayout from "./components/Layout/PublicLayout";
import DashboardLayout from "./components/Layout/DashboardLayout";
import ProtectedRoute from "./components/ProtectedRoute";

import Landing from "./pages/Landing";
import About from "./pages/About";
import FinancialReport from "./pages/FinancialReport";
import Articles from "./pages/Articles";
import ArticleDetail from "./pages/ArticleDetail";
import ArticleEditor from "./pages/ArticleEditor";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AuthCallback from "./pages/AuthCallback";
import ResetPassword from "./pages/ResetPassword";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";

import DashboardHome from "./pages/dashboard/DashboardHome";
import UserVerification from "./pages/dashboard/UserVerification";
import Referensi from "./pages/dashboard/Referensi";
import ArticleModeration from "./pages/dashboard/ArticleModeration";
import FinancePage from "./pages/dashboard/FinancePage";
import InventoryPage from "./pages/dashboard/InventoryPage";
import Settings from "./pages/dashboard/Settings";

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AuthProvider>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Landing />} />
            <Route path="/tentang" element={<About />} />
            <Route path="/keuangan" element={<FinancialReport />} />
            <Route path="/bacaan" element={<Articles />} />
            <Route path="/bacaan/tulis" element={<ProtectedRoute><ArticleEditor /></ProtectedRoute>} />
            <Route path="/bacaan/:slug" element={<ArticleDetail />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/profil" element={<ProtectedRoute requireApproved={false}><Profile /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Route>

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute roles={["admin", "bendahara", "inventaris", "humas"]}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardHome />} />
            <Route
              path="verifikasi-user"
              element={
                <ProtectedRoute roles={["admin"]}>
                  <UserVerification />
                </ProtectedRoute>
              }
            />
            <Route
              path="artikel"
              element={
                <ProtectedRoute roles={["admin"]}>
                  <ArticleModeration />
                </ProtectedRoute>
              }
            />
            <Route
              path="referensi"
              element={
                <ProtectedRoute roles={["admin"]}>
                  <Referensi />
                </ProtectedRoute>
              }
            />
            <Route
              path="keuangan"
              element={
                <ProtectedRoute roles={["admin", "bendahara"]}>
                  <FinancePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="inventaris"
              element={
                <ProtectedRoute roles={["admin", "inventaris"]}>
                  <InventoryPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="pengaturan"
              element={
                <ProtectedRoute roles={["admin", "humas"]}>
                  <Settings />
                </ProtectedRoute>
              }
            />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
