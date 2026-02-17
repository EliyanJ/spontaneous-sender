import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);

  useEffect(() => {
    const checkOnboarding = async () => {
      if (!user) {
        setOnboardingChecked(true);
        return;
      }
      try {
        const { data } = await supabase
          .from("profiles")
          .select("onboarding_completed")
          .eq("id", user.id)
          .single();
        setOnboardingCompleted(data?.onboarding_completed ?? false);
      } catch {
        setOnboardingCompleted(false);
      }
      setOnboardingChecked(true);
    };

    if (!loading && user) {
      checkOnboarding();
    } else if (!loading && !user) {
      setOnboardingChecked(true);
    }
  }, [user, loading]);

  if (loading || !onboardingChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    const redirectTo = location.pathname + location.search;
    return <Navigate to={`/auth?next=${encodeURIComponent(redirectTo)}`} replace />;
  }

  // Redirect to onboarding if not completed (but not if already on /onboarding)
  if (
    onboardingCompleted === false &&
    !location.pathname.startsWith("/onboarding") &&
    !location.pathname.startsWith("/connect-gmail") &&
    !location.pathname.startsWith("/admin")
  ) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
};
