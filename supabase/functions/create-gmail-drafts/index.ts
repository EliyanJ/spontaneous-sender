import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Extraire le token et vérifier l'authentification
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      throw new Error("User not authenticated");
    }

    const url = new URL(req.url);
    let code = url.searchParams.get("code");
    
    if (!code && req.method === "POST") {
      try {
        const raw = await req.text();
        if (raw) {
          const body = JSON.parse(raw);
          code = body?.code;
        }
      } catch (_) {
        // ignore parse errors when body is empty
      }
    }
    
    const clientId = Deno.env.get("GMAIL_CLIENT_ID");
    const clientSecret = Deno.env.get("GMAIL_CLIENT_SECRET");
    const redirectUri = Deno.env.get("GMAIL_REDIRECT_URI");

    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error("Missing Gmail OAuth configuration");
    }

    // Si on a un code, on échange contre un access token
    if (code) {
      console.log("Exchanging code for access token");
      
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });

      const tokenData = await tokenResponse.json();
      
      if (!tokenResponse.ok) {
        console.error("Token exchange error:", tokenData);
        throw new Error(`Failed to exchange code: ${tokenData.error_description || tokenData.error}`);
      }

      const accessToken = tokenData.access_token;
      console.log("Access token obtained successfully");

      // Récupérer les entreprises avec status "not sent" et un selected_email
      const { data: companies, error: companiesError } = await supabaseClient
        .from("companies")
        .select("id, nom, selected_email")
        .eq("user_id", user.id)
        .eq("status", "not sent")
        .not("selected_email", "is", null);

      if (companiesError) {
        throw companiesError;
      }

      console.log(`Found ${companies?.length || 0} companies to create drafts for`);

      const results = {
        success: 0,
        failed: 0,
        errors: [] as string[],
      };

      // Créer un brouillon pour chaque entreprise
      for (const company of companies || []) {
        try {
          // Créer le message email au format RFC 2822
          const subject = `Candidature spontanée - ${company.nom}`;
          const body = `Bonjour,\n\nJe me permets de vous contacter concernant ${company.nom}.\n\nCordialement`;
          
          const emailContent = [
            `To: ${company.selected_email}`,
            `Subject: ${subject}`,
            "",
            body,
          ].join("\r\n");

          // Encoder en base64url
          const encodedMessage = btoa(emailContent)
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/, "");

          // Créer le brouillon via Gmail API
          const draftResponse = await fetch(
            "https://gmail.googleapis.com/gmail/v1/users/me/drafts",
            {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                message: {
                  raw: encodedMessage,
                },
              }),
            }
          );

          const draftData = await draftResponse.json();

          if (!draftResponse.ok) {
            console.error(`Failed to create draft for ${company.nom}:`, draftData);
            results.failed++;
            results.errors.push(`${company.nom}: ${draftData.error?.message || "Unknown error"}`);
            continue;
          }

          console.log(`Draft created successfully for ${company.nom}`);

          // Mettre à jour le statut de l'entreprise
          const { error: updateError } = await supabaseClient
            .from("companies")
            .update({ status: "draft created" })
            .eq("id", company.id);

          if (updateError) {
            console.error(`Failed to update status for ${company.nom}:`, updateError);
          }

          results.success++;
        } catch (error) {
          console.error(`Error creating draft for ${company.nom}:`, error);
          results.failed++;
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          results.errors.push(`${company.nom}: ${errorMessage}`);
        }
      }

      return new Response(
        JSON.stringify({
          message: `Brouillons créés: ${results.success} succès, ${results.failed} échecs`,
          results,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Si pas de code, retourner l'URL d'autorisation
    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", "https://www.googleapis.com/auth/gmail.modify");
    authUrl.searchParams.set("access_type", "offline");
    authUrl.searchParams.set("prompt", "consent");

    return new Response(
      JSON.stringify({ authUrl: authUrl.toString() }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in create-gmail-drafts:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
