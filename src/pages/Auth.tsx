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
  const [googleLoading, setGoogleLoading] = useState(false);
  const [processingCallback, setProcessingCallback] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Initialisation...");
  
  const nextPath = searchParams.get('next') || '/dashboard';

  const handleGoogleSignIn = async () => {
    // Protection contre les appels multiples (module-level)
    if (authAttempted) {
      console.log('[Auth] OAuth already attempted, skipping');
      return;
    }
    authAttempted = true;
    
    setGoogleLoading(true);
    setStatusMessage("Redirection vers Google...");
    
    try {
      if (nextPath !== '/dashboard') {
        sessionStorage.setItem('post_login_redirect', nextPath);
      }

      const redirectUrl = `${window.location.origin}/auth`;
      console.log('[Auth] Starting OAuth with redirect URL:', redirectUrl);

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          scopes: 'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent', // Force consent to get refresh_token
          },
        },
      });

      if (error) {
        console.error('[Auth] OAuth error:', error);
        toast.error(error.message);
        setGoogleLoading(false);
        authAttempted = false; // Reset pour permettre une nouvelle tentative
      }
    } catch (error: any) {
      console.error('[Auth] OAuth exception:', error);
      toast.error(error.message || "Une erreur est survenue");
      setGoogleLoading(false);
      authAttempted = false;
    }
  };

  // Effet principal: gère le callback OAuth ou lance l'authentification
  useEffect(() => {
    // Reset du flag au montage pour permettre une nouvelle tentative si l'utilisateur revient
    authAttempted = false;
    
    if (nextPath !== '/dashboard') {
      sessionStorage.setItem("post_login_redirect", nextPath);
    }

    const processAuth = async () => {
      const hash = window.location.hash;
      console.log('[Auth] Processing auth, hash present:', !!hash);
      
      // ========== CAS 1: Callback OAuth en cours ==========
      if (hash && hash.includes('access_token')) {
        setProcessingCallback(true);
        setStatusMessage("Finalisation de la connexion...");
        authAttempted = true; // Marquer comme traité pour éviter les re-triggers
        
        // Extraire les tokens AVANT de nettoyer le hash
        let providerTokenFromHash: string | null = null;
        let providerRefreshTokenFromHash: string | null = null;

        try {
          const hashParams = new URLSearchParams(hash.substring(1));
          providerTokenFromHash = hashParams.get('provider_token');
          providerRefreshTokenFromHash = hashParams.get('provider_refresh_token');
          
          console.log('[Auth] === Gmail Token Extraction ===');
          console.log('[Auth] provider_token present:', !!providerTokenFromHash);
          console.log('[Auth] provider_refresh_token present:', !!providerRefreshTokenFromHash);
          
          // Debug: afficher tous les paramètres du hash
          console.log('[Auth] All hash params:', Object.fromEntries(hashParams.entries()));
        } catch (parseError) {
          console.error('[Auth] Error parsing hash params:', parseError);
        }

        const timeout = setTimeout(() => {
          console.error('[Auth] OAuth callback timeout - redirecting');
          setProcessingCallback(false);
          const returnPath = sessionStorage.getItem("post_login_redirect") || "/dashboard";
          sessionStorage.removeItem("post_login_redirect");
          navigate(decodeReturnPath(returnPath), { replace: true });
        }, 15000);

        try {
          // Nettoyer le hash de l'URL APRÈS avoir extrait les tokens
          window.history.replaceState({}, "", window.location.pathname + window.location.search);
          
          // Attendre un court instant pour que Supabase traite le token
          await new Promise(resolve => setTimeout(resolve, 500));
          
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          
          if (sessionError) {
            console.error('[Auth] Session error:', sessionError);
            clearTimeout(timeout);
            toast.error("Erreur lors de la récupération de la session");
            setProcessingCallback(false);
            authAttempted = false;
            return;
          }
          
          if (session) {
            console.log('[Auth] === Session Retrieved ===');
            console.log('[Auth] User ID:', session.user?.id);
            console.log('[Auth] User email:', session.user?.email);

            // Stocker les tokens Gmail
            if (providerTokenFromHash) {
              setStatusMessage("Configuration Gmail...");
              console.log('[Auth] === Storing Gmail Tokens ===');
              
              const { data, error } = await supabase.functions.invoke('store-gmail-tokens', {
                headers: { Authorization: `Bearer ${session.access_token}` },
                body: {
                  provider_token: providerTokenFromHash,
                  provider_refresh_token: providerRefreshTokenFromHash,
                },
              });

              if (error) {
                console.error('[Auth] Error storing Gmail tokens:', error);
                toast.error("Erreur lors de la configuration Gmail - veuillez réessayer");
              } else {
                console.log('[Auth] Gmail tokens stored successfully:', data);
                toast.success("Connexion Google et Gmail réussie !");
              }
            } else {
              console.warn('[Auth] No provider_token in hash - Gmail scopes may not be granted');
              toast.success("Connexion réussie !");
              toast.warning("Gmail non configuré - reconnectez-vous si nécessaire");
            }

            clearTimeout(timeout);
            const returnPath = sessionStorage.getItem("post_login_redirect") || "/dashboard";
            sessionStorage.removeItem("post_login_redirect");
            console.log('[Auth] Redirecting to:', returnPath);
            navigate(decodeReturnPath(returnPath), { replace: true });
          } else {
            console.error('[Auth] No session found after OAuth callback');
            clearTimeout(timeout);
            toast.error("Erreur: session non trouvée");
            setProcessingCallback(false);
            authAttempted = false;
          }
        } catch (error) {
          console.error('[Auth] OAuth callback error:', error);
          clearTimeout(timeout);
          toast.error("Erreur lors de la connexion");
          setProcessingCallback(false);
          authAttempted = false;
        }
        return;
      }
      
      // ========== CAS 2: Pas de callback, vérifier session existante ==========
      console.log('[Auth] No OAuth callback, checking existing session...');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        console.log('[Auth] Existing session found, redirecting');
        const returnPath = sessionStorage.getItem("post_login_redirect") || "/dashboard";
        sessionStorage.removeItem("post_login_redirect");
        navigate(decodeReturnPath(returnPath), { replace: true });
        return;
      }
      
      // ========== CAS 3: Pas de session, lancer OAuth ==========
      console.log('[Auth] No session, initiating OAuth...');
      handleGoogleSignIn();
    };
    
    processAuth();
    
    // Cleanup: ne pas reset authAttempted ici pour éviter les boucles
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
