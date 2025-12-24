import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

interface AdminRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('admin' | 'support' | 'analyst')[];
}

export const AdminRoute = ({ children, allowedRoles = ['admin'] }: AdminRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkRole = async () => {
      if (!user) {
        setIsAuthorized(false);
        setLoading(false);
        return;
      }

      try {
        // Check each allowed role
        for (const role of allowedRoles) {
          const { data, error } = await supabase.rpc('has_role', {
            _user_id: user.id,
            _role: role
          });

          if (error) {
            console.error('Error checking role:', error);
            continue;
          }

          if (data === true) {
            setIsAuthorized(true);
            setLoading(false);
            return;
          }
        }

        setIsAuthorized(false);
      } catch (error) {
        console.error('Error checking admin role:', error);
        setIsAuthorized(false);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      checkRole();
    }
  }, [user, authLoading, allowedRoles]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Vérification des permissions...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
