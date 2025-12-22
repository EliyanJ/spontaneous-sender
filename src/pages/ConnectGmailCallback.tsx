import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import cronosLogo from "@/assets/cronos-logo.png";

const ConnectGmailCallback = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [message, setMessage] = useState("Connexion Gmail en cours...");

  useEffect(() => {
    const handleCallback = async () => {
      // Extraire les tokens du hash
      const hash = window.location.hash;
      
      if (!hash || !hash.includes('access_token')) {
        console.error('[GmailCallback] No access token in hash');
        setStatus("error");
        setMessage("Erreur: tokens non trouvés dans la réponse");
        setTimeout(() => navigate("/dashboard"), 3000);
        return;
      }

      let providerToken: string | null = null;
      let providerRefreshToken: string | null = null;

      try {
        const hashParams = new URLSearchParams(hash.substring(1));
        providerToken = hashParams.get('provider_token');
        providerRefreshToken = hashParams.get('provider_refresh_token');

        console.log('[GmailCallback] Tokens extracted:');
        console.log('[GmailCallback] provider_token present:', !!providerToken);
        console.log('[GmailCallback] provider_refresh_token present:', !!providerRefreshToken);
      } catch (parseError) {
        console.error('[GmailCallback] Error parsing hash:', parseError);
      }

      if (!providerToken) {
        setStatus("error");
        setMessage("Erreur: token Gmail non reçu");
        setTimeout(() => navigate("/dashboard"), 3000);
        return;
      }

      // Attendre que Supabase traite le callback OAuth
      setMessage("Vérification de la session...");
      
      // Écouter les changements d'authentification
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          console.log('[GmailCallback] Auth event:', event);
          
          if (session) {
            setMessage("Stockage des tokens Gmail...");

            try {
              const { error } = await supabase.functions.invoke('store-gmail-tokens', {
                headers: { Authorization: `Bearer ${session.access_token}` },
                body: {
                  provider_token: providerToken,
                  provider_refresh_token: providerRefreshToken,
                },
              });

              if (error) {
                console.error('[GmailCallback] Error storing tokens:', error);
                setStatus("error");
                setMessage("Erreur lors du stockage des tokens");
                toast.error("Erreur de connexion Gmail");
              } else {
                console.log('[GmailCallback] Tokens stored successfully');
                setStatus("success");
                setMessage("Gmail connecté avec succès !");
                toast.success("Gmail connecté avec succès !");
              }
            } catch (err) {
              console.error('[GmailCallback] Exception:', err);
              setStatus("error");
              setMessage("Erreur inattendue");
            }

            // Rediriger après un court délai
            setTimeout(() => {
              navigate("/dashboard", { replace: true });
            }, 2000);
          }
        }
      );

      // Vérifier si une session existe déjà
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session && providerToken) {
        // Session existante, stocker directement les tokens
        setMessage("Stockage des tokens Gmail...");

        try {
          const { error } = await supabase.functions.invoke('store-gmail-tokens', {
            headers: { Authorization: `Bearer ${session.access_token}` },
            body: {
              provider_token: providerToken,
              provider_refresh_token: providerRefreshToken,
            },
          });

          if (error) {
            console.error('[GmailCallback] Error storing tokens:', error);
            setStatus("error");
            setMessage("Erreur lors du stockage des tokens");
            toast.error("Erreur de connexion Gmail");
          } else {
            console.log('[GmailCallback] Tokens stored successfully');
            setStatus("success");
            setMessage("Gmail connecté avec succès !");
            toast.success("Gmail connecté avec succès !");
          }
        } catch (err) {
          console.error('[GmailCallback] Exception:', err);
          setStatus("error");
          setMessage("Erreur inattendue");
        }

        setTimeout(() => {
          navigate("/dashboard", { replace: true });
        }, 2000);
      }

      // Timeout de sécurité
      setTimeout(() => {
        if (status === "processing") {
          setStatus("error");
          setMessage("Délai dépassé, veuillez réessayer");
          setTimeout(() => navigate("/dashboard"), 2000);
        }
      }, 10000);

      return () => subscription.unsubscribe();
    };

    handleCallback();
  }, [navigate, status]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center space-y-6">
        <img src={cronosLogo} alt="Cronos" className="h-20 w-20" />
        <span className="text-2xl font-bold text-foreground">Cronos</span>
        
        {status === "processing" && (
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        )}
        {status === "success" && (
          <CheckCircle className="h-10 w-10 text-green-500" />
        )}
        {status === "error" && (
          <XCircle className="h-10 w-10 text-destructive" />
        )}
        
        <p className="text-lg font-medium text-foreground">
          {message}
        </p>
        <p className="text-sm text-muted-foreground">
          {status === "processing" && "Veuillez patienter..."}
          {status === "success" && "Redirection vers le dashboard..."}
          {status === "error" && "Redirection..."}
        </p>
      </div>
    </div>
  );
};

export default ConnectGmailCallback;
