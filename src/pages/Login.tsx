import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mail, Key, Loader2 } from "lucide-react";
import cronosLogo from "@/assets/cronos-logo.png";

const Login = () => {
  const navigate = useNavigate();
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Vérifier si déjà connecté
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard", { replace: true });
      }
    });
  }, [navigate]);

  const handleGoogleLogin = async () => {
    setIsRedirecting(true);
    
    try {
      const redirectUrl = `${window.location.origin}/auth`;
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
        },
      });

      if (error) {
        console.error('[Login] OAuth error:', error);
        toast.error(error.message);
        setIsRedirecting(false);
      }
    } catch (error: any) {
      console.error('[Login] OAuth exception:', error);
      toast.error(error.message || "Une erreur est survenue");
      setIsRedirecting(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Connexion réussie !");
        navigate("/dashboard", { replace: true });
      }
    } catch (error: any) {
      toast.error(error.message || "Une erreur est survenue");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasskeyClick = () => {
    toast.info("Les clés d'accès seront bientôt disponibles !", {
      description: "Utilisez Google ou votre email pour vous connecter.",
    });
  };

  // Overlay de redirection Google
  if (isRedirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-6 animate-fade-in">
          <img src={cronosLogo} alt="Cronos" className="h-20 w-20" />
          <span className="text-2xl font-bold text-foreground">Cronos</span>
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-lg font-medium text-foreground">
            Redirection vers Google...
          </p>
          <p className="text-sm text-muted-foreground">
            Veuillez patienter
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo et titre */}
        <div className="flex flex-col items-center space-y-4">
          <img src={cronosLogo} alt="Cronos" className="h-16 w-16" />
          <h1 className="text-2xl font-bold text-foreground">Cronos</h1>
        </div>

        {/* Boutons de connexion */}
        <div className="space-y-4">
          {!showEmailForm ? (
            <>
              {/* Bouton Email */}
              <Button
                variant="outline"
                className="w-full h-12 justify-start gap-3 text-base"
                onClick={() => setShowEmailForm(true)}
              >
                <Mail className="h-5 w-5" />
                Continuer avec Email
              </Button>

              {/* Bouton Passkey */}
              <Button
                variant="outline"
                className="w-full h-12 justify-start gap-3 text-base"
                onClick={handlePasskeyClick}
              >
                <Key className="h-5 w-5" />
                Connexion avec clé d'accès
              </Button>

              {/* Bouton Google */}
              <Button
                variant="outline"
                className="w-full h-12 justify-start gap-3 text-base"
                onClick={handleGoogleLogin}
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continuer avec Google
              </Button>
            </>
          ) : (
            /* Formulaire Email/Password */
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="vous@exemple.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div className="flex items-center justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowEmailForm(false)}
                >
                  Retour
                </Button>
                <Link
                  to="/forgot-password"
                  className="text-sm text-primary hover:underline"
                >
                  Mot de passe oublié ?
                </Link>
              </div>
              <Button
                type="submit"
                className="w-full h-12"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  "Se connecter"
                )}
              </Button>
            </form>
          )}
        </div>

        {/* Séparateur */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
        </div>

        {/* Lien inscription */}
        <div className="text-center">
          <p className="text-muted-foreground">
            Nouveau sur Cronos ?{" "}
            <Link to="/register" className="text-primary hover:underline font-medium">
              Créer votre compte
            </Link>
          </p>
        </div>

        {/* Séparateur */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
        </div>

        {/* Liens en bas */}
        <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
          <Link to="/help" className="hover:text-primary transition-colors">
            Aide
          </Link>
          <span>|</span>
          <Link to="/privacy-policy" className="hover:text-primary transition-colors">
            Confidentialité
          </Link>
          <span>|</span>
          <Link to="/terms-of-service" className="hover:text-primary transition-colors">
            Conditions
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
