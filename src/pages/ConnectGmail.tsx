import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Mail, Shield, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import cronosLogo from "@/assets/cronos-logo.png";

type Language = 'fr' | 'en';

const translations = {
  fr: {
    checking: "Vérification...",
    authError: "Vous devez être connecté pour autoriser Gmail",
    title: "Connecter Gmail",
    description: "Pour envoyer des emails de prospection, Cronos a besoin d'accéder à votre compte Gmail",
    canDoTitle: "Ce que Cronos pourra faire :",
    canDo: [
      "Envoyer des emails de prospection en votre nom",
      "Voir votre profil Gmail (adresse email et informations publiques)"
    ],
    cantDoTitle: "Ce que Cronos ne fera PAS :",
    cantDo: [
      "Accéder à vos contacts personnels",
      "Modifier vos paramètres Gmail",
      "Utiliser vos données à d'autres fins"
    ],
    security: "Vos identifiants sont sécurisés par Google. Vous pouvez révoquer l'accès à tout moment depuis les paramètres de votre compte Google.",
    authorize: "Autoriser l'accès Gmail",
    later: "Plus tard",
    redirecting: "Redirection vers Google..."
  },
  en: {
    checking: "Checking...",
    authError: "You must be logged in to authorize Gmail",
    title: "Connect Gmail",
    description: "To send prospecting emails, Cronos needs access to your Gmail account",
    canDoTitle: "What Cronos can do:",
    canDo: [
      "Send prospecting emails on your behalf",
      "View your Gmail profile (email address and public info)"
    ],
    cantDoTitle: "What Cronos will NOT do:",
    cantDo: [
      "Access your personal contacts",
      "Modify your Gmail settings",
      "Use your data for other purposes"
    ],
    security: "Your credentials are secured by Google. You can revoke access at any time from your Google account settings.",
    authorize: "Authorize Gmail access",
    later: "Later",
    redirecting: "Redirecting to Google..."
  }
};

const ConnectGmail = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [language, setLanguage] = useState<Language>('fr');

  const returnTo = searchParams.get("returnTo") || "/dashboard";
  const t = translations[language];

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error(t.authError);
        navigate("/auth?next=/connect-gmail");
        return;
      }

      setChecking(false);
    };

    checkAuth();
  }, [navigate, t.authError]);

  const handleConnectGmail = async () => {
    if (loading) return;
    setLoading(true);

    try {
      sessionStorage.setItem('gmail_connect_return_to', returnTo);
      
      const redirectUrl = `${window.location.origin}/connect-gmail/callback`;
      console.log('[ConnectGmail] Starting Gmail OAuth with redirect:', redirectUrl);

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          scopes: 'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.modify',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        console.error('[ConnectGmail] OAuth error:', error);
        toast.error(error.message);
        setLoading(false);
      }
    } catch (error: any) {
      console.error('[ConnectGmail] Exception:', error);
      toast.error(error.message || "Une erreur est survenue");
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate(returnTo);
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">{t.checking}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-lg w-full relative">
        {/* Language toggle */}
        <div className="absolute top-4 right-4 flex gap-1">
          <Button 
            variant={language === 'fr' ? 'default' : 'ghost'} 
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setLanguage('fr')}
          >
            FR
          </Button>
          <Button 
            variant={language === 'en' ? 'default' : 'ghost'} 
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setLanguage('en')}
          >
            EN
          </Button>
        </div>

        <CardHeader className="text-center space-y-4 pt-12">
          <div className="flex justify-center">
            <div className="relative">
              <img src={cronosLogo} alt="Cronos" className="h-16 w-16" />
              <div className="absolute -bottom-1 -right-1 bg-primary rounded-full p-1">
                <Mail className="h-4 w-4 text-primary-foreground" />
              </div>
            </div>
          </div>
          <CardTitle className="text-2xl">{t.title}</CardTitle>
          <CardDescription className="text-base">
            {t.description}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Ce que Cronos peut faire */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              {t.canDoTitle}
            </h3>
            <ul className="text-sm text-muted-foreground space-y-2 ml-6">
              {t.canDo.map((item, index) => (
                <li key={index}>• {item}</li>
              ))}
            </ul>
          </div>

          {/* Ce que Cronos ne fera PAS */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <X className="h-4 w-4 text-red-500" />
              {t.cantDoTitle}
            </h3>
            <ul className="text-sm text-muted-foreground space-y-2 ml-6">
              {t.cantDo.map((item, index) => (
                <li key={index}>• {item}</li>
              ))}
            </ul>
          </div>

          {/* Sécurité */}
          <div className="bg-muted/50 rounded-lg p-4 flex items-start gap-3">
            <Shield className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <p className="text-sm text-muted-foreground">
              {t.security}
            </p>
          </div>

          {/* Boutons */}
          <div className="flex flex-col gap-3 pt-2">
            <Button 
              onClick={handleConnectGmail} 
              disabled={loading}
              size="lg"
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  {t.redirecting}
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-5 w-5" />
                  {t.authorize}
                </>
              )}
            </Button>
            
            <Button 
              variant="ghost" 
              onClick={handleCancel}
              disabled={loading}
              className="w-full"
            >
              {t.later}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConnectGmail;
