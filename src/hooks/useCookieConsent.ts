import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const CONSENT_KEY = "cookie_consent_v1";

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
      const stored = localStorage.getItem(CONSENT_KEY);
      if (stored) return JSON.parse(stored) as CookieConsentState;
    } catch {}
    return DEFAULT_STATE;
  });

  const persist = useCallback((newState: CookieConsentState) => {
    setState(newState);
    localStorage.setItem(CONSENT_KEY, JSON.stringify(newState));
  }, []);

  const acceptAll = useCallback(async (userId?: string) => {
    const newState: CookieConsentState = {
      hasConsented: true,
      analyticsEnabled: true,
      preferencesEnabled: true,
    };
    persist(newState);
    await saveConsentToDB(true, true, userId);
  }, [persist]);

  const rejectAll = useCallback(async (userId?: string) => {
    const newState: CookieConsentState = {
      hasConsented: true,
      analyticsEnabled: false,
      preferencesEnabled: false,
    };
    persist(newState);
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
    persist(newState);
    await saveConsentToDB(analytics, preferences, userId);
  }, [persist]);

  return {
    ...state,
    acceptAll,
    rejectAll,
    updateConsent,
  };
};
