import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Mail, Shield, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import cronosLogo from "@/assets/cronos-logo.png";

let gmailAuthAttempted = false;

const ConnectGmail = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Vérifier si l'utilisateur est connecté
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error("Vous devez être connecté pour autoriser Gmail");
        navigate("/auth?next=/connect-gmail");
        return;
      }

      // Vérifier si Gmail est déjà connecté
      const { data: tokens } = await supabase
        .from("gmail_tokens")
        .select("access_token, refresh_token")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (tokens?.access_token && tokens?.refresh_token) {
        toast.info("Gmail est déjà connecté");
        navigate("/dashboard");
        return;
      }

      setChecking(false);
    };

    checkAuth();
  }, [navigate]);

  const handleConnectGmail = async () => {
    if (gmailAuthAttempted) return;
    gmailAuthAttempted = true;
    setLoading(true);

    try {
      const redirectUrl = `${window.location.origin}/connect-gmail/callback`;
      console.log('[ConnectGmail] Starting Gmail OAuth with redirect:', redirectUrl);

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
        console.error('[ConnectGmail] OAuth error:', error);
        toast.error(error.message);
        gmailAuthAttempted = false;
      }
    } catch (error: any) {
      console.error('[ConnectGmail] Exception:', error);
      toast.error(error.message || "Une erreur est survenue");
      gmailAuthAttempted = false;
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate("/dashboard");
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Vérification...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-lg w-full">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="relative">
              <img src={cronosLogo} alt="Cronos" className="h-16 w-16" />
              <div className="absolute -bottom-1 -right-1 bg-primary rounded-full p-1">
                <Mail className="h-4 w-4 text-primary-foreground" />
              </div>
            </div>
          </div>
          <CardTitle className="text-2xl">Connecter Gmail</CardTitle>
          <CardDescription className="text-base">
            Pour envoyer des emails de prospection, Cronos a besoin d'accéder à votre compte Gmail
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Ce que Cronos peut faire */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              Ce que Cronos pourra faire :
            </h3>
            <ul className="text-sm text-muted-foreground space-y-2 ml-6">
              <li>• Envoyer des emails en votre nom</li>
              <li>• Lire vos emails pour détecter les réponses</li>
              <li>• Créer des brouillons d'emails</li>
            </ul>
          </div>

          {/* Ce que Cronos ne peut PAS faire */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <X className="h-4 w-4 text-red-500" />
              Ce que Cronos ne peut PAS faire :
            </h3>
            <ul className="text-sm text-muted-foreground space-y-2 ml-6">
              <li>• Supprimer vos emails</li>
              <li>• Accéder à vos contacts personnels</li>
              <li>• Modifier vos paramètres Gmail</li>
            </ul>
          </div>

          {/* Sécurité */}
          <div className="bg-muted/50 rounded-lg p-4 flex items-start gap-3">
            <Shield className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <p className="text-sm text-muted-foreground">
              Vos identifiants sont sécurisés par Google. Vous pouvez révoquer l'accès à tout moment depuis les paramètres de votre compte Google.
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
                  Redirection vers Google...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-5 w-5" />
                  Autoriser l'accès Gmail
                </>
              )}
            </Button>
            
            <Button 
              variant="ghost" 
              onClick={handleCancel}
              disabled={loading}
              className="w-full"
            >
              Plus tard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConnectGmail;
