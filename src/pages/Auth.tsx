import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
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

    // ========== CRITICAL: Extraire les tokens du hash IMMÉDIATEMENT ==========
    const hash = window.location.hash;
    let providerTokenFromHash: string | null = null;
    let providerRefreshTokenFromHash: string | null = null;
    
    if (hash && hash.includes('access_token')) {
      try {
        const hashParams = new URLSearchParams(hash.substring(1));
        providerTokenFromHash = hashParams.get('provider_token');
        providerRefreshTokenFromHash = hashParams.get('provider_refresh_token');
        
        console.log('[Auth] === Gmail Token Extraction ===');
        console.log('[Auth] provider_token present:', !!providerTokenFromHash);
        console.log('[Auth] provider_refresh_token present:', !!providerRefreshTokenFromHash);
      } catch (parseError) {
        console.error('[Auth] Error parsing hash params:', parseError);
      }
    }

    // ========== Écouter les changements d'authentification ==========
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[Auth] Auth state changed:', event, 'Session:', !!session);
        
        if (event === 'SIGNED_IN' && session) {
          setStatusMessage("Connexion réussie...");
          
          // Stocker les tokens Gmail si présents
          if (providerTokenFromHash) {
            setStatusMessage("Configuration Gmail...");
            console.log('[Auth] Storing Gmail tokens...');
            
            // Utiliser setTimeout pour éviter le deadlock Supabase
            setTimeout(async () => {
              try {
                const { data, error } = await supabase.functions.invoke('store-gmail-tokens', {
                  headers: { Authorization: `Bearer ${session.access_token}` },
                  body: {
                    provider_token: providerTokenFromHash,
                    provider_refresh_token: providerRefreshTokenFromHash,
                  },
                });

                if (error) {
                  console.error('[Auth] Error storing Gmail tokens:', error);
                  toast.error("Erreur configuration Gmail");
                } else {
                  console.log('[Auth] Gmail tokens stored:', data);
                  toast.success("Connexion Google et Gmail réussie !");
                }
              } catch (err) {
                console.error('[Auth] Exception storing tokens:', err);
              }
              
              // Rediriger après stockage des tokens
              const returnPath = sessionStorage.getItem("post_login_redirect") || "/dashboard";
              sessionStorage.removeItem("post_login_redirect");
              navigate(decodeReturnPath(returnPath), { replace: true });
            }, 100);
          } else {
            toast.success("Connexion réussie !");
            const returnPath = sessionStorage.getItem("post_login_redirect") || "/dashboard";
            sessionStorage.removeItem("post_login_redirect");
            navigate(decodeReturnPath(returnPath), { replace: true });
          }
        }
      }
    );

    // ========== Gérer l'authentification initiale ==========
    const initAuth = async () => {
      // CAS 1: Callback OAuth en cours - Supabase va le traiter automatiquement
      if (hash && hash.includes('access_token')) {
        console.log('[Auth] OAuth callback detected, waiting for Supabase...');
        setStatusMessage("Finalisation de la connexion...");
        authAttempted = true;
        
        // Timeout de sécurité
        setTimeout(() => {
          console.log('[Auth] Checking session after timeout...');
          supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) {
              console.error('[Auth] No session after timeout');
              toast.error("Erreur: session non trouvée. Réessayez.");
              // Nettoyer et permettre une nouvelle tentative
              window.history.replaceState({}, "", window.location.pathname);
              authAttempted = false;
              setStatusMessage("Redirection vers Google...");
              handleGoogleSignIn();
            }
          });
        }, 5000);
        return;
      }
      
      // CAS 2: Vérifier session existante
      console.log('[Auth] Checking existing session...');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        console.log('[Auth] Existing session found');
        const returnPath = sessionStorage.getItem("post_login_redirect") || "/dashboard";
        sessionStorage.removeItem("post_login_redirect");
        navigate(decodeReturnPath(returnPath), { replace: true });
        return;
      }
      
      // CAS 3: Pas de session, lancer OAuth
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
        const redirectUrl = `${window.location.origin}/auth`;
        console.log('[Auth] Starting OAuth with redirect:', redirectUrl);

        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: redirectUrl,
            scopes: 'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly',
            queryParams: {
              access_type: 'offline',
              prompt: 'consent',
            },
          },
        });

        if (error) {
          console.error('[Auth] OAuth error:', error);
          toast.error(error.message);
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
