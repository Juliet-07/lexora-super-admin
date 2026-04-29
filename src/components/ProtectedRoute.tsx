import { Navigate } from "react-router-dom";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuth = localStorage.getItem("adminToken");
  if (!isAuth) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
