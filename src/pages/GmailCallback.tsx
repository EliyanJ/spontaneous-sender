import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export const GmailCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get("code");
      const error = searchParams.get("error");

      // Éviter les doubles appels en retirant le code de l'URL immédiatement
      if (code || error) {
        window.history.replaceState({}, '', '/auth/gmail/callback');
      }

      if (error) {
        toast({
          title: "Erreur d'autorisation",
          description: "L'autorisation Gmail a été refusée",
          variant: "destructive",
        });
        setStatus("error");
        setTimeout(() => navigate("/dashboard"), 2000);
        return;
      }

      if (!code) {
        toast({
          title: "Erreur",
          description: "Code d'autorisation manquant",
          variant: "destructive",
        });
        setStatus("error");
        setTimeout(() => navigate("/dashboard"), 2000);
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error("Session non trouvée");
        }

        // Déterminer le flux (drafts ou send) conservé avant la redirection OAuth
        const flow = sessionStorage.getItem("gmail_flow") || "drafts";
        const pending = sessionStorage.getItem("pending_email");
        const payload = pending ? JSON.parse(pending) : {};

        const functionName = flow === "send" ? "send-gmail-emails" : "create-gmail-drafts";
        const requestBody: any = { code, ...payload };

        // Appeler l'edge function avec le code OAuth
        const { data, error: invokeError } = await supabase.functions.invoke(
          functionName,
          {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
            body: requestBody,
          }
        );

        if (invokeError) throw invokeError;

        // Nettoyage du contexte
        sessionStorage.removeItem("gmail_flow");
        sessionStorage.removeItem("pending_email");

        if (flow === "send" ? data?.success : data?.results) {
          toast({
            title: flow === "send" ? "Emails envoyés !" : "Brouillons créés !",
            description: data.message,
          });
          setStatus("success");
        } else {
          throw new Error("Réponse inattendue du serveur");
        }
      } catch (error) {
        console.error("Erreur lors de la création des brouillons:", error);
        toast({
          title: "Erreur",
          description: "Impossible de créer les brouillons Gmail",
          variant: "destructive",
        });
        setStatus("error");
      } finally {
        setTimeout(() => navigate("/dashboard?tab=contact-emails"), 2000);
      }
    };

    handleCallback();
  }, [searchParams, navigate, toast]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center space-y-4">
        {status === "loading" && (
          <>
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
            <p className="text-lg">Création des brouillons Gmail...</p>
          </>
        )}
        {status === "success" && (
          <>
            <div className="h-12 w-12 mx-auto text-green-500">✓</div>
            <p className="text-lg">Brouillons créés avec succès !</p>
            <p className="text-sm text-muted-foreground">Redirection en cours...</p>
          </>
        )}
        {status === "error" && (
          <>
            <div className="h-12 w-12 mx-auto text-red-500">✗</div>
            <p className="text-lg">Une erreur est survenue</p>
            <p className="text-sm text-muted-foreground">Redirection en cours...</p>
          </>
        )}
      </div>
    </div>
  );
};
