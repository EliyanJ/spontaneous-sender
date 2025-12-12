import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Mail } from "lucide-react";

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [processingCallback, setProcessingCallback] = useState(false);
  
  const nextPath = searchParams.get('next') || '/dashboard';

  useEffect(() => {
    if (nextPath !== '/dashboard') {
      sessionStorage.setItem("post_login_redirect", nextPath);
    }

    const handleGoogleCallback = async () => {
      const hash = window.location.hash;
      
      // Pas de hash = pas de callback OAuth en cours
      if (!hash) {
        setProcessingCallback(false);
        return;
      }

      // Vérifier si c'est bien un callback OAuth (contient access_token)
      if (!hash.includes('access_token')) {
        setProcessingCallback(false);
        return;
      }

      setProcessingCallback(true);

      // ========== CRITICAL FIX: Extraire les tokens AVANT de nettoyer le hash ==========
      // Supabase ne persiste PAS provider_token dans la session, on doit le lire du hash
      let providerTokenFromHash: string | null = null;
      let providerRefreshTokenFromHash: string | null = null;

      try {
        const hashParams = new URLSearchParams(hash.substring(1));
        providerTokenFromHash = hashParams.get('provider_token');
        providerRefreshTokenFromHash = hashParams.get('provider_refresh_token');
        
        console.log('=== Gmail Token Extraction ===');
        console.log('Hash contains provider_token:', !!providerTokenFromHash);
        console.log('Hash contains provider_refresh_token:', !!providerRefreshTokenFromHash);
        if (providerTokenFromHash) {
          console.log('Provider token length:', providerTokenFromHash.length);
        }
      } catch (parseError) {
        console.error('Error parsing hash params:', parseError);
      }

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

      const timeout = setTimeout(() => {
        console.error('OAuth callback timeout - redirecting to dashboard');
        setProcessingCallback(false);
        const returnPath = sessionStorage.getItem("post_login_redirect") || "/dashboard";
        sessionStorage.removeItem("post_login_redirect");
        navigate(decodeReturnPath(returnPath), { replace: true });
      }, 10000);

      try {
        // Nettoyer le hash de l'URL APRES avoir extrait les tokens
        window.history.replaceState({}, "", window.location.pathname + window.location.search);
        
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          clearTimeout(timeout);
          toast.error("Erreur lors de la récupération de la session");
          setProcessingCallback(false);
          return;
        }
        
        if (session) {
          console.log('=== Session Retrieved ===');
          console.log('User ID:', session.user?.id);
          console.log('User email:', session.user?.email);

          // Utiliser les tokens extraits du hash (pas de session.provider_token)
          if (providerTokenFromHash) {
            console.log('=== Storing Gmail Tokens ===');
            console.log('Calling store-gmail-tokens edge function...');
            
            const { data, error } = await supabase.functions.invoke('store-gmail-tokens', {
              headers: { Authorization: `Bearer ${session.access_token}` },
              body: {
                provider_token: providerTokenFromHash,
                provider_refresh_token: providerRefreshTokenFromHash,
              },
            });

            if (error) {
              console.error('Error storing Gmail tokens:', error);
              toast.error("Erreur lors de la configuration Gmail");
            } else {
              console.log('Gmail tokens stored successfully:', data);
              toast.success("Connexion Google et Gmail réussie !");
            }
          } else {
            console.log('No provider_token in hash - Gmail not configured');
            toast.success("Connexion réussie !");
          }

          clearTimeout(timeout);
          const returnPath = sessionStorage.getItem("post_login_redirect") || "/dashboard";
          sessionStorage.removeItem("post_login_redirect");
          navigate(decodeReturnPath(returnPath), { replace: true });
        } else {
          console.error('No session found after OAuth callback');
          clearTimeout(timeout);
          toast.error("Erreur: session non trouvée");
          setProcessingCallback(false);
        }
      } catch (error) {
        console.error('OAuth callback error:', error);
        clearTimeout(timeout);
        toast.error("Erreur lors de la connexion");
        setProcessingCallback(false);
      }
    };

    handleGoogleCallback();
  }, [navigate, nextPath]);

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      if (nextPath !== '/dashboard') {
        sessionStorage.setItem('post_login_redirect', nextPath);
      }

      // Utiliser l'URL d'origine pour le redirect (preview ou production)
      const redirectUrl = `${window.location.origin}/auth`;
      console.log('OAuth redirect URL:', redirectUrl);

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          scopes: 'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/gmail.compose',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        toast.error(error.message);
        setGoogleLoading(false);
      }
    } catch (error: any) {
      toast.error(error.message || "Une erreur est survenue");
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      {processingCallback ? (
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-center text-lg font-medium">Connexion en cours...</p>
              <p className="text-center text-sm text-muted-foreground">
                Veuillez patienter pendant que nous finalisons votre connexion.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="space-y-3 text-center">
            <div className="flex justify-center mb-2">
              <div className="p-3 bg-primary/10 rounded-full">
                <Mail className="h-8 w-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold">Spontaneous Sender</CardTitle>
            <CardDescription className="text-base">
              Automatisez vos candidatures spontanées avec l'IA
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Button
              variant="default"
              size="lg"
              className="w-full h-12 text-base"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
            >
              {googleLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Connexion en cours...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-5 w-5" />
                  Se connecter avec Google
                </>
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              En vous connectant, vous acceptez nos{" "}
              <a href="/terms-of-service" className="underline hover:text-foreground">
                conditions d'utilisation
              </a>{" "}
              et notre{" "}
              <a href="/privacy-policy" className="underline hover:text-foreground">
                politique de confidentialité
              </a>
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Auth;
