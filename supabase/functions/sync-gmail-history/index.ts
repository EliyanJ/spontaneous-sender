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

    console.log("Syncing Gmail history for user:", user.id);

    // Récupérer le token Gmail
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

      const newExpiresAt = new Date();
      newExpiresAt.setHours(newExpiresAt.getHours() + 1);

      await supabaseClient
        .from("gmail_tokens")
        .update({
          access_token: accessToken,
          expires_at: newExpiresAt.toISOString(),
        })
        .eq("user_id", user.id);
    }

    // Récupérer les entreprises de l'utilisateur avec leurs emails
    const { data: companies, error: companiesError } = await supabaseClient
      .from("companies")
      .select("id, nom, selected_email, siren")
      .eq("user_id", user.id)
      .not("selected_email", "is", null);

    if (companiesError) {
      throw companiesError;
    }

    // Créer un map email -> company pour recherche rapide
    const emailToCompany = new Map();
    (companies || []).forEach(company => {
      if (company.selected_email) {
        emailToCompany.set(company.selected_email.toLowerCase(), company);
      }
    });

    console.log(`Found ${emailToCompany.size} companies with emails`);

    // Récupérer les emails envoyés depuis Gmail (derniers 500, max ~1 mois)
    const gmailResponse = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages?labelIds=SENT&maxResults=500",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!gmailResponse.ok) {
      const error = await gmailResponse.text();
      console.error("Failed to fetch Gmail messages:", error);
      throw new Error("Failed to fetch Gmail messages");
    }

    const gmailData = await gmailResponse.json();
    const messages = gmailData.messages || [];

    console.log(`Found ${messages.length} sent messages in Gmail`);

    let syncedCount = 0;
    const syncedEmails: string[] = [];

    // Traiter chaque message
    for (const message of messages) {
      try {
        // Récupérer les détails du message
        const messageResponse = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}?format=metadata&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (!messageResponse.ok) {
          console.error(`Failed to fetch message ${message.id}`);
          continue;
        }

        const messageData = await messageResponse.json();
        const headers = messageData.payload?.headers || [];
        
        const toHeader = headers.find((h: any) => h.name === "To")?.value || "";
        const subjectHeader = headers.find((h: any) => h.name === "Subject")?.value || "";
        const dateHeader = headers.find((h: any) => h.name === "Date")?.value || "";

        // Extraire les emails du champ "To"
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        const recipientEmails = toHeader.match(emailRegex) || [];

        // Pour chaque destinataire, vérifier si c'est une entreprise connue
        for (const recipientEmail of recipientEmails) {
          const company = emailToCompany.get(recipientEmail.toLowerCase());
          
          if (company) {
            // Vérifier si on n'a pas déjà une entrée pour cet email
            const { data: existing } = await supabaseClient
              .from("email_campaigns")
              .select("id")
              .eq("user_id", user.id)
              .eq("recipient", recipientEmail)
              .maybeSingle();

            if (!existing) {
              // Créer une entrée dans email_campaigns
              await supabaseClient.from("email_campaigns").insert({
                user_id: user.id,
                recipient: recipientEmail,
                subject: subjectHeader || "Email envoyé",
                body: "(Synchronisé depuis Gmail)",
                sent_at: dateHeader ? new Date(dateHeader).toISOString() : new Date().toISOString(),
                status: 'sent',
                company_id: company.id
              });

              syncedCount++;
              syncedEmails.push(`${company.nom} (${recipientEmail})`);
              console.log(`Synced: ${company.nom} - ${recipientEmail}`);
            }
          }
        }
      } catch (error: any) {
        console.error(`Error processing message ${message.id}:`, error);
        // Continue avec le prochain message
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Synchronisation terminée: ${syncedCount} emails historiques ajoutés`,
        syncedCount,
        totalProcessed: messages.length,
        syncedEmails: syncedEmails.slice(0, 20), // Limiter l'affichage aux 20 premiers
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in sync-gmail-history:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
