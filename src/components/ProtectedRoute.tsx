import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * LOW-03: Validate the `next` redirect param to prevent open-redirect attacks.
 * Only allow relative paths starting with "/" and reject paths beginning with "//"
 * (which browsers interpret as protocol-relative URLs pointing to external hosts).
 */
function isSafeRedirect(url: string): boolean {
  if (!url) return false;
  if (!url.startsWith("/")) return false;
  if (url.startsWith("//")) return false;
  // Reject anything containing a protocol (e.g. %2F%2F, http:)
  const decoded = decodeURIComponent(url);
  if (/^\/\/|https?:/i.test(decoded)) return false;
  return true;
}

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
  }, [user, loading, location.pathname]);

  if (loading || !onboardingChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    const rawRedirect = location.pathname + location.search;
    // LOW-03: only encode & use the redirect if it's a safe internal path
    const safeNext = isSafeRedirect(rawRedirect) ? encodeURIComponent(rawRedirect) : "";
    const authUrl = safeNext ? `/auth?next=${safeNext}` : "/auth";
    return <Navigate to={authUrl} replace />;
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
