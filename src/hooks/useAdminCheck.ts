import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const useAdminCheck = () => {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase.rpc('has_role', {
          _user_id: user.id,
          _role: 'admin'
        });

        if (error) {
          console.error('Error checking admin role:', error);
          setIsAdmin(false);
        } else {
          setIsAdmin(data === true);
        }
      } catch (error) {
        console.error('Failed to check admin:', error);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      checkAdmin();
    }
  }, [user, authLoading]);

  return { isAdmin, loading: authLoading || loading };
};
