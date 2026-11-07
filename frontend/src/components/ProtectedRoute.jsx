import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function ProtectedRoute({ children, requiredRole }) {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A1628] text-slate-300 flex items-center justify-center" role="status">
        <span className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mr-3" />
        Checking your session...
      </div>
    );
  }
  if (!isAuthenticated) {
    return <Navigate to={requiredRole === "admin" ? "/login-admin" : "/login-user"} replace state={{ from: location }} />;
  }
  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to={user.role === "admin" ? "/admin/analytics" : "/dashboard/map"} replace />;
  }
  return children;
}
