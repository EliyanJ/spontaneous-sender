import { useState, useEffect } from "react";
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
      
      if (!hash) {
        setProcessingCallback(false);
        return;
      }

      setProcessingCallback(true);

      try {
        window.history.replaceState({}, "", window.location.pathname + window.location.search);
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          const anySession = session as any;
          const providerToken = anySession?.provider_token || null;
          const providerRefreshToken = anySession?.provider_refresh_token || null;

          if (providerToken) {
            const { error } = await supabase.functions.invoke('store-gmail-tokens', {
              headers: { Authorization: `Bearer ${session.access_token}` },
              body: {
                provider_token: providerToken,
                provider_refresh_token: providerRefreshToken,
              },
            });

            if (error) {
              toast.error("Erreur lors de la configuration Gmail");
            } else {
              toast.success("Connexion Google et Gmail réussie !");
            }
          }

          const returnPath = sessionStorage.getItem("post_login_redirect") || "/dashboard";
          sessionStorage.removeItem("post_login_redirect");
          navigate(returnPath, { replace: true });
        }
      } catch (error) {
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
              <a href="/terms" className="underline hover:text-foreground">
                conditions d'utilisation
              </a>{" "}
              et notre{" "}
              <a href="/privacy" className="underline hover:text-foreground">
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
