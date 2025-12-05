import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    // Capturer la page actuelle pour y revenir après connexion
    // Only encode once - the pathname and search are already in correct format
    const redirectTo = location.pathname + location.search;
    return <Navigate to={`/auth?next=${encodeURIComponent(redirectTo)}`} replace />;
  }

  return <>{children}</>;
};
