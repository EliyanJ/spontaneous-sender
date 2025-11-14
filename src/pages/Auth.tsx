import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Mail } from "lucide-react";
import { Separator } from "@/components/ui/separator";

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [processingCallback, setProcessingCallback] = useState(false);
  
  // Récupérer la page de destination depuis l'URL
  const nextPath = searchParams.get('next') || '/dashboard';

  useEffect(() => {
    // Stocker le chemin de destination en sessionStorage pour le conserver pendant OAuth
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
        // Nettoyer le hash immédiatement (sécurité)
        window.history.replaceState({}, "", window.location.pathname + window.location.search);

        // Attendre que la session soit établie
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          console.log("Session Google établie, extraction des tokens Gmail...");
          
          // Extraire les tokens Gmail depuis la session
          const anySession = session as any;
          const providerToken = anySession?.provider_token || null;
          const providerRefreshToken = anySession?.provider_refresh_token || null;

          if (providerToken) {
            console.log("Tokens Gmail détectés, stockage...");
            
            const { error } = await supabase.functions.invoke('store-gmail-tokens', {
              headers: { Authorization: `Bearer ${session.access_token}` },
              body: {
                provider_token: providerToken,
                provider_refresh_token: providerRefreshToken,
              },
            });

            if (error) {
              console.error("Erreur stockage tokens:", error);
              toast.error("Erreur lors de la configuration Gmail");
            } else {
              console.log("Tokens Gmail stockés avec succès !");
              toast.success("Connexion Google et Gmail réussie !");
            }
          }

          // Rediriger vers le dashboard
          const returnPath = sessionStorage.getItem("post_login_redirect") || "/dashboard";
          sessionStorage.removeItem("post_login_redirect");
          navigate(returnPath, { replace: true });
        }
      } catch (error) {
        console.error("Erreur callback OAuth:", error);
        toast.error("Erreur lors de la connexion");
        setProcessingCallback(false);
      }
    };

    handleGoogleCallback();
  }, [navigate, nextPath]);

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      // Sauvegarder la destination pour après le callback
      if (nextPath !== '/dashboard') {
        sessionStorage.setItem('post_login_redirect', nextPath);
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'https://spontaneous-sender.lovable.app/auth',
          scopes: 'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.compose https://www.googleapis.com/auth/gmail.modify',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
          // Pas de skipBrowserRedirect - Supabase redirige automatiquement dans le même onglet
        },
      });

      if (error) {
        console.error('OAuth error:', error);
        toast.error(error.message || "Erreur lors de la connexion Google");
      }
      
      // Pas besoin de gérer data.url, Supabase redirige automatiquement
    } catch (error: any) {
      console.error('OAuth error:', error);
      toast.error(error?.message || "Erreur lors de la connexion Google");
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (error) throw error;

      toast.success("Compte créé avec succès ! Vous pouvez maintenant vous connecter.");
      setEmail("");
      setPassword("");
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la création du compte");
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast.success("Connexion réussie !");
      
      // Rediriger vers la page d'origine ou le dashboard
      const redirectPath = sessionStorage.getItem('post_login_redirect') || nextPath;
      sessionStorage.removeItem('post_login_redirect');
      navigate(redirectPath);
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la connexion");
    } finally {
      setLoading(false);
    }
  };

  // Afficher un loader pendant le traitement du callback OAuth
  if (processingCallback) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 to-secondary">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Connexion en cours...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 to-secondary p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Prospection Entreprises</CardTitle>
          <CardDescription>
            Connectez-vous ou créez un compte pour commencer
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            className="w-full"
            variant="outline"
            size="lg"
          >
            {googleLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Connexion en cours...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-5 w-5" />
                Continuer avec Google (Gmail)
              </>
            )}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Ou continuer avec email
              </span>
            </div>
          </div>

          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Connexion</TabsTrigger>
              <TabsTrigger value="signup">Inscription</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="votre@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Mot de passe</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Connexion...
                    </>
                  ) : (
                    "Se connecter"
                  )}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="votre@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Mot de passe</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    minLength={6}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Création...
                    </>
                  ) : (
                    "Créer un compte"
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;