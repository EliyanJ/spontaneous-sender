import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import cronosLogo from "@/assets/cronos-logo.png";

// ========== CRITICAL FIX: Module-level flag to survive re-renders ==========
let authAttempted = false;

// Fonction pour décoder proprement une URL
const decodeReturnPath = (path: string): string => {
  try {
    let decoded = path;
    while (decoded !== decodeURIComponent(decoded)) {
      decoded = decodeURIComponent(decoded);
    }
    return decoded;
  } catch {
    return path;
  }
};

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [statusMessage, setStatusMessage] = useState("Initialisation...");
  
  const nextPath = searchParams.get('next') || '/dashboard';

  useEffect(() => {
    // Reset au montage pour permettre une nouvelle tentative
    authAttempted = false;
    
    if (nextPath !== '/dashboard') {
      sessionStorage.setItem("post_login_redirect", nextPath);
    }

    // ========== Écouter les changements d'authentification ==========
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[Auth] Auth state changed:', event, 'Session:', !!session);
        
        if (event === 'SIGNED_IN' && session) {
          setStatusMessage("Connexion réussie...");
          toast.success("Connexion réussie !");
          
          const returnPath = sessionStorage.getItem("post_login_redirect") || "/dashboard";
          sessionStorage.removeItem("post_login_redirect");
          navigate(decodeReturnPath(returnPath), { replace: true });
        }
      }
    );

    // ========== Gérer l'authentification initiale ==========
    const initAuth = async () => {
      // CAS 1: Vérifier session existante
      console.log('[Auth] Checking existing session...');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        console.log('[Auth] Existing session found');
        const returnPath = sessionStorage.getItem("post_login_redirect") || "/dashboard";
        sessionStorage.removeItem("post_login_redirect");
        navigate(decodeReturnPath(returnPath), { replace: true });
        return;
      }
      
      // CAS 2: Pas de session, lancer OAuth via Lovable Cloud
      console.log('[Auth] No session, starting OAuth...');
      handleGoogleSignIn();
    };

    const handleGoogleSignIn = async () => {
      if (authAttempted) {
        console.log('[Auth] OAuth already attempted, skipping');
        return;
      }
      authAttempted = true;
      setStatusMessage("Redirection vers Google...");
      
      try {
        console.log('[Auth] Starting Lovable Cloud OAuth...');

        const result = await lovable.auth.signInWithOAuth("google", {
          redirect_uri: window.location.origin,
        });

        if (result.error) {
          console.error('[Auth] OAuth error:', result.error);
          toast.error(result.error.message);
          authAttempted = false;
        }
      } catch (error: any) {
        console.error('[Auth] OAuth exception:', error);
        toast.error(error.message || "Une erreur est survenue");
        authAttempted = false;
      }
    };

    initAuth();

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate, nextPath]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center space-y-6">
        <img src={cronosLogo} alt="Cronos" className="h-20 w-20" />
        <span className="text-2xl font-bold text-foreground">Cronos</span>
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-lg font-medium text-foreground">
          {statusMessage}
        </p>
        <p className="text-sm text-muted-foreground">
          Veuillez patienter
        </p>
      </div>
    </div>
  );
};

export default Auth;
