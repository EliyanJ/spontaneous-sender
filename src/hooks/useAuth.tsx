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

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        setLoading(false);

        // Invalidate Gmail tokens on logout to prevent automatic reconnection
        if (event === 'SIGNED_OUT' && lastUserIdRef.current) {
          const userIdToCleanup = lastUserIdRef.current;
          // Use setTimeout to avoid Supabase deadlock
          setTimeout(async () => {
            try {
              await supabase.from('gmail_tokens').delete().eq('user_id', userIdToCleanup);
              console.log('Gmail tokens invalidated on logout');
            } catch (error) {
              console.error('Error invalidating Gmail tokens:', error);
            }
          }, 0);
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
