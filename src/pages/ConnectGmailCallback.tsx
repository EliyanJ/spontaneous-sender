import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import cronosLogo from "@/assets/cronos-logo.png";

const ConnectGmailCallback = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [message, setMessage] = useState("Connexion Gmail en cours...");
  const processedRef = useRef(false);

  useEffect(() => {
    // Prevent double execution
    if (processedRef.current) return;
    processedRef.current = true;

    const handleCallback = async () => {
      // Get returnTo from sessionStorage
      const returnTo = sessionStorage.getItem('gmail_connect_return_to') || '/dashboard?tab=settings';
      sessionStorage.removeItem('gmail_connect_return_to');

      // Extract tokens from hash BEFORE any cleanup
      const hash = window.location.hash;
      
      if (!hash || !hash.includes('access_token')) {
        console.error('[GmailCallback] No access token in hash');
        setStatus("error");
        setMessage("Erreur: tokens non trouvés dans la réponse");
        setTimeout(() => navigateWithRefresh(returnTo), 3000);
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
        // Clean hash only if we have an error
        window.history.replaceState({}, '', window.location.pathname);
        setStatus("error");
        setMessage("Erreur: token Gmail non reçu");
        setTimeout(() => navigateWithRefresh(returnTo), 3000);
        return;
      }

      setMessage("Attente de la session...");
      
      // Wait for session with retry loop - DO NOT clean hash yet
      let session = null;
      const maxRetries = 20;
      const retryDelay = 500;
      
      for (let i = 0; i < maxRetries; i++) {
        console.log(`[GmailCallback] Session check attempt ${i + 1}/${maxRetries}`);
        const { data } = await supabase.auth.getSession();
        
        if (data.session) {
          session = data.session;
          console.log('[GmailCallback] Session found!', session.user?.email);
          break;
        }
        
        // Wait before next retry
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }

      // NOW we can clean the hash since we've extracted what we need
      window.history.replaceState({}, '', window.location.pathname);

      if (!session) {
        console.error('[GmailCallback] No session after retries');
        setStatus("error");
        setMessage("Session expirée, veuillez vous reconnecter");
        toast.error("Session expirée");
        setTimeout(() => navigate('/auth', { replace: true }), 2000);
        return;
      }

      // Store tokens
      await storeTokensAndRedirect(session, providerToken, providerRefreshToken, returnTo);
    };

    const storeTokensAndRedirect = async (
      session: any, 
      providerToken: string, 
      providerRefreshToken: string | null, 
      returnTo: string
    ) => {
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
          
          // Dispatch event to notify other components
          window.dispatchEvent(new CustomEvent('gmail-connected'));
        }
      } catch (err) {
        console.error('[GmailCallback] Exception:', err);
        setStatus("error");
        setMessage("Erreur inattendue");
        toast.error("Erreur inattendue");
      }

      // Redirect after a short delay with refresh parameter
      setTimeout(() => {
        navigateWithRefresh(returnTo);
      }, 1500);
    };

    const navigateWithRefresh = (returnTo: string) => {
      const separator = returnTo.includes('?') ? '&' : '?';
      navigate(`${returnTo}${separator}gmailRefresh=true`, { replace: true });
    };

    handleCallback();
  }, [navigate]);

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
          {status === "success" && "Redirection..."}
          {status === "error" && "Redirection..."}
        </p>
      </div>
    </div>
  );
};

export default ConnectGmailCallback;
