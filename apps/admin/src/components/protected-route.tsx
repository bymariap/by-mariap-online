import { Outlet } from "react-router-dom";
// import { Navigate } from "react-router-dom";
// import { useAuth } from "@/features/auth/auth-context";

export function ProtectedRoute() {
  // TEMP: rutas sin protección para pruebas locales. Revertir antes de commitear.
  // const { user, loading } = useAuth();
  // if (loading) return <div className="p-6">Cargando…</div>;
  // if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}
