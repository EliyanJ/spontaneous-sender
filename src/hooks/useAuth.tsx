import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const lastUserIdRef = useRef<string | null>(null);
  // MED-03: flag to prevent race condition where cleanup fires after re-login
  const cleanupInProgressRef = useRef(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        setLoading(false);

        // Invalidate Gmail tokens on logout to prevent automatic reconnection
        if (event === 'SIGNED_OUT' && lastUserIdRef.current) {
          const userIdToCleanup = lastUserIdRef.current;
          // Guard: don't clean up if a new session already started
          if (!cleanupInProgressRef.current) {
            cleanupInProgressRef.current = true;
            // Use a microtask instead of setTimeout(0) to avoid the Supabase
            // re-entrant call while keeping the async cleanup outside the listener
            Promise.resolve().then(async () => {
              try {
                // Double-check: abort if user re-logged in before we ran
                const { data: { session: activeSession } } = await supabase.auth.getSession();
                if (!activeSession) {
                  await supabase.from('gmail_tokens').delete().eq('user_id', userIdToCleanup);
                }
              } catch (error) {
                if (import.meta.env.DEV) console.error('Error invalidating Gmail tokens:', error);
              } finally {
                cleanupInProgressRef.current = false;
              }
            });
          }
        }

        // Track current user ID for cleanup on logout
        lastUserIdRef.current = currentSession?.user?.id ?? null;
      }
    );

    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      setLoading(false);
      lastUserIdRef.current = initialSession?.user?.id ?? null;
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return { user, session, loading, signOut };
};
