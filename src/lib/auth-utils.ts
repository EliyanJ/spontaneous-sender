import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

/**
 * Detect if we're on a custom domain (not lovable.app or lovableproject.com)
 */
const isCustomDomain = () =>
  !window.location.hostname.includes("lovable.app") &&
  !window.location.hostname.includes("lovableproject.com");

/**
 * Sign in with Google OAuth, handling custom domain redirect_uri_mismatch
 * by bypassing the Lovable auth-bridge on custom domains.
 */
export const signInWithGoogle = async (redirectPath = "/dashboard") => {
  if (isCustomDomain()) {
    // Custom domain: bypass auth-bridge, use Supabase directly
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}${redirectPath}`,
        skipBrowserRedirect: true,
      },
    });

    if (error) {
      return { error };
    }

    if (data?.url) {
      // Validate OAuth URL before redirect
      const oauthUrl = new URL(data.url);
      const allowedHosts = [
        "accounts.google.com",
        "fxnnnhmhshmhcttmucwf.supabase.co",
      ];
      if (!allowedHosts.some((host) => oauthUrl.hostname === host)) {
        return { error: new Error("Invalid OAuth redirect URL") };
      }
      window.location.href = data.url;
      return { error: null };
    }

    return { error: new Error("No OAuth URL returned") };
  } else {
    // Lovable domains: use managed auth-bridge
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });

    if (result.error) {
      return { error: result.error };
    }
    return { error: null };
  }
};
