import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

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

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      throw new Error("User not authenticated");
    }

    console.log("Creating Gmail drafts for user:", user.id);

    // Récupérer le token Gmail de l'utilisateur
    const { data: tokenData, error: tokenError } = await supabaseClient
      .from("gmail_tokens")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (tokenError || !tokenData) {
      return new Response(
        JSON.stringify({ 
          error: "Gmail not connected", 
          message: "Please connect your Gmail account first" 
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    let accessToken = tokenData.access_token;

    // Vérifier si le token a expiré
    const expiresAt = new Date(tokenData.expires_at);
    const now = new Date();
    
    if (expiresAt <= now && tokenData.refresh_token) {
      console.log("Token expired, refreshing...");
      
      const clientId = Deno.env.get("GMAIL_CLIENT_ID");
      const clientSecret = Deno.env.get("GMAIL_CLIENT_SECRET");

      const refreshResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId!,
          client_secret: clientSecret!,
          refresh_token: tokenData.refresh_token,
          grant_type: "refresh_token",
        }),
      });

      if (!refreshResponse.ok) {
        const error = await refreshResponse.text();
        console.error("Failed to refresh token:", error);
        throw new Error("Failed to refresh Gmail token");
      }

      const refreshData = await refreshResponse.json();
      accessToken = refreshData.access_token;

      // Mettre à jour le token dans la base
      const newExpiresAt = new Date();
      newExpiresAt.setHours(newExpiresAt.getHours() + 1);

      await supabaseClient
        .from("gmail_tokens")
        .update({
          access_token: accessToken,
          expires_at: newExpiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      console.log("Token refreshed successfully");
    }

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
        const subject = `Candidature spontanée - ${company.nom}`;
        const body = `Bonjour,\n\nJe me permets de vous contacter concernant ${company.nom}.\n\nCordialement`;
        
        const emailContent = [
          `To: ${company.selected_email}`,
          `Subject: ${subject}`,
          "",
          body,
        ].join("\r\n");

        const encodedMessage = btoa(emailContent)
          .replace(/\+/g, "-")
          .replace(/\//g, "_")
          .replace(/=+$/, "");

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
      } catch (error: any) {
        console.error(`Error creating draft for ${company.nom}:`, error);
        results.failed++;
        results.errors.push(`${company.nom}: ${error.message}`);
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
  } catch (error: any) {
    console.error("Error in create-gmail-drafts:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});