import { useRef, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type ActionType = 
  | 'session_start'
  | 'session_end'
  | 'tab_change'
  | 'search_mode_selected'
  | 'search_started'
  | 'search_completed'
  | 'company_added'
  | 'company_selected'
  | 'email_compose_started'
  | 'email_sent'
  | 'email_scheduled'
  | 'pipeline_changed'
  | 'ai_mode_used'
  | 'manual_mode_used'
  | 'page_view'
  | 'error';

interface ActionData {
  [key: string]: string | number | boolean | null | undefined | object;
}

export const useActivityTracking = () => {
  const { user } = useAuth();
  const sessionId = useRef<string>(crypto.randomUUID());
  const sessionStartTime = useRef<number>(Date.now());

  const trackAction = useCallback(async (
    actionType: ActionType | string,
    actionData?: ActionData,
    durationMs?: number
  ) => {
    if (!user) return;

    try {
      const { error } = await supabase.from('user_activity_logs').insert([{
        user_id: user.id,
        session_id: sessionId.current,
        action_type: actionType,
        action_data: actionData || null,
        duration_ms: durationMs || null
      }]);

      if (error) {
        console.error('Error tracking action:', error);
      }
    } catch (err) {
      console.error('Failed to track action:', err);
    }
  }, [user]);

  // Track session start on mount
  useEffect(() => {
    if (user) {
      trackAction('session_start', {
        userAgent: navigator.userAgent,
        screenWidth: window.innerWidth,
        screenHeight: window.innerHeight,
        language: navigator.language
      });
    }

    // Track session end on unmount
    return () => {
      if (user) {
        const duration = Date.now() - sessionStartTime.current;
        // Use sendBeacon for reliable tracking on page close
        const payload = JSON.stringify({
          user_id: user.id,
          session_id: sessionId.current,
          action_type: 'session_end',
          action_data: null,
          duration_ms: duration
        });
        
        navigator.sendBeacon?.(
          `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/user_activity_logs`,
          new Blob([payload], { type: 'application/json' })
        );
      }
    };
  }, [user, trackAction]);

  return { 
    trackAction, 
    sessionId: sessionId.current,
    getSessionDuration: () => Date.now() - sessionStartTime.current
  };
};
