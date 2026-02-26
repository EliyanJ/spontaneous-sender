import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

// Stored permanently only when user accepts
const CONSENT_KEY = "cookie_consent_v1";
// Stored only for the current session when user refuses
const REFUSED_SESSION_KEY = "cookie_refused_session";

export interface CookieConsentState {
  hasConsented: boolean;
  analyticsEnabled: boolean;
  preferencesEnabled: boolean;
}

const DEFAULT_STATE: CookieConsentState = {
  hasConsented: false,
  analyticsEnabled: false,
  preferencesEnabled: false,
};

const saveConsentToDB = async (
  analyticsAccepted: boolean,
  preferencesAccepted: boolean,
  userId?: string
) => {
  try {
    const fingerprint = btoa(
      [navigator.userAgent, navigator.language, window.innerWidth].join("|")
    ).slice(0, 64);

    await supabase.from("cookie_consents").insert({
      user_id: userId || null,
      session_fingerprint: fingerprint,
      analytics_accepted: analyticsAccepted,
      preferences_accepted: preferencesAccepted,
    });
  } catch (err) {
    // Non-blocking — consent is also stored in localStorage
    console.debug("Cookie consent DB save failed:", err);
  }
};

export const useCookieConsent = () => {
  const [state, setState] = useState<CookieConsentState>(() => {
    try {
      // Permanently accepted: read from localStorage
      const stored = localStorage.getItem(CONSENT_KEY);
      if (stored) return JSON.parse(stored) as CookieConsentState;
      // Refused this session: don't show banner again until next session
      const refusedThisSession = sessionStorage.getItem(REFUSED_SESSION_KEY);
      if (refusedThisSession) {
        return { hasConsented: true, analyticsEnabled: false, preferencesEnabled: false };
      }
    } catch {}
    return DEFAULT_STATE;
  });

  const persist = useCallback((newState: CookieConsentState, permanent: boolean) => {
    setState(newState);
    if (permanent) {
      localStorage.setItem(CONSENT_KEY, JSON.stringify(newState));
      sessionStorage.removeItem(REFUSED_SESSION_KEY);
    } else {
      // Only remember refusal for this session
      sessionStorage.setItem(REFUSED_SESSION_KEY, "1");
      localStorage.removeItem(CONSENT_KEY);
    }
  }, []);

  const acceptAll = useCallback(async (userId?: string) => {
    const newState: CookieConsentState = {
      hasConsented: true,
      analyticsEnabled: true,
      preferencesEnabled: true,
    };
    persist(newState, true); // permanent
    await saveConsentToDB(true, true, userId);
  }, [persist]);

  const rejectAll = useCallback(async (userId?: string) => {
    const newState: CookieConsentState = {
      hasConsented: true,
      analyticsEnabled: false,
      preferencesEnabled: false,
    };
    persist(newState, false); // session only — will re-ask next visit
    await saveConsentToDB(false, false, userId);
  }, [persist]);

  const updateConsent = useCallback(async (
    analytics: boolean,
    preferences: boolean,
    userId?: string
  ) => {
    const newState: CookieConsentState = {
      hasConsented: true,
      analyticsEnabled: analytics,
      preferencesEnabled: preferences,
    };
    // If at least one category is enabled → permanent, otherwise session only
    const permanent = analytics || preferences;
    persist(newState, permanent);
    await saveConsentToDB(analytics, preferences, userId);
  }, [persist]);

  return {
    ...state,
    acceptAll,
    rejectAll,
    updateConsent,
  };
};
