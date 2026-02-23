import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { supabase } from "@/integrations/supabase/client";
import { signInWithGoogle } from "@/lib/auth-utils";
import { toast } from "sonner";
import { Mail, Loader2, ArrowLeft } from "lucide-react";
import logoTransparent from "@/assets/logo-transparent.png";
import logoBlue from "@/assets/logo-blue.png";

const Login = () => {
  const navigate = useNavigate();
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);

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
      const { error } = await signInWithGoogle("/auth");

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
    setLoginError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setLoginError("Adresse email ou mot de passe incorrect");
      } else {
        toast.success("Connexion réussie !");
        navigate("/dashboard", { replace: true });
      }
    } catch (error: any) {
      setLoginError("Une erreur est survenue lors de la connexion");
    } finally {
      setIsLoading(false);
    }
  };


  // Overlay de redirection Google
  if (isRedirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-teal-800">
        <div className="flex flex-col items-center space-y-6 animate-fade-in">
          <img src={logoTransparent} alt="Cronos" className="h-20 w-auto" />
          <span className="text-2xl font-bold text-white">Cronos</span>
          <Loader2 className="h-10 w-10 animate-spin text-white" />
          <p className="text-lg font-medium text-white">
            Redirection vers Google...
          </p>
          <p className="text-sm text-white/70">
            Veuillez patienter
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-teal-800 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 px-4">
      {/* Lien retour accueil */}
      <Link
        to="/"
        className="w-full max-w-md mb-4 flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour à l'accueil
      </Link>

      {/* Carte blanche centrale */}
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-8 sm:p-10 border border-gray-200 dark:border-gray-700">
        {/* Logo et titre */}
        <div className="flex flex-col items-center space-y-4 mb-8">
          <img src={logoBlue} alt="Cronos" className="h-16 w-auto" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Cronos</h1>
        </div>

        {/* Boutons de connexion */}
        <div className="space-y-4">
          {!showEmailForm ? (
            <>
              {/* Bouton Email */}
              <Button
                variant="outline"
                className="w-full h-12 justify-start gap-3 text-base border-2 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                onClick={() => setShowEmailForm(true)}
              >
                <Mail className="h-5 w-5" />
                Continuer avec Email
              </Button>

              {/* Bouton Google */}
              <Button
                variant="outline"
                className="w-full h-12 justify-start gap-3 text-base border-2 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
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
                <Label htmlFor="email" className="text-gray-700 dark:text-gray-300">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="vous@exemple.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setLoginError(null); }}
                  required
                  className="border-2 border-gray-300 dark:border-gray-600 focus:border-primary bg-white dark:bg-gray-800"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-700 dark:text-gray-300">Mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setLoginError(null); }}
                  required
                  className="border-2 border-gray-300 dark:border-gray-600 focus:border-primary bg-white dark:bg-gray-800"
                />
              </div>
              {loginError && (
                <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-lg px-4 py-3 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {loginError}
                </div>
              )}
              <div className="flex items-center justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowEmailForm(false)}
                  className="text-gray-600 dark:text-gray-400"
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

        {/* Séparateur "ou" */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-gray-300 dark:border-gray-600" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400">ou</span>
          </div>
        </div>

        {/* Lien inscription */}
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">
            Nouveau sur Cronos ?{" "}
            <Link to="/register" className="text-primary hover:underline font-medium">
              Créer votre compte
            </Link>
          </p>
        </div>

        {/* Séparateur */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-gray-300 dark:border-gray-600" />
          </div>
        </div>

        {/* Liens en bas */}
        <div className="flex items-center justify-center gap-4 text-sm text-gray-500 dark:text-gray-400">
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
