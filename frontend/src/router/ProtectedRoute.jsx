import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ROLE_HOME = {
  ADMIN:   "/admin",
  TEACHER: "/teacher",
  STUDENT: "/student",
};

const ProtectedRoute = ({ children, role }) => {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#070b14]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-violet-400" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (role && user?.role !== role) {
    const home = ROLE_HOME[user?.role] ?? "/login";
    return <Navigate to={home} replace />;
  }

  return children;
};

export default ProtectedRoute;
