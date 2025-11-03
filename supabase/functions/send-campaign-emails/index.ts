import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  campaignId: string;
}

const requestSchema = z.object({
  campaignId: z.string().uuid("Invalid campaign ID format")
});

function sanitizeError(error: any): { message: string; code?: string } {
  return {
    message: error.message || "Unknown error",
    code: error.code || error.name
  };
}

function mapToUserError(error: any): string {
  const msg = error.message?.toLowerCase() || "";
  if (msg.includes("campaign") || msg.includes("introuvable")) return "Campagne non trouvée";
  if (msg.includes("auth") || msg.includes("unauthorized")) return "Non autorisé";
  if (msg.includes("profile")) return "Profil utilisateur introuvable";
  if (msg.includes("smtp") || msg.includes("email")) return "Erreur d'envoi d'email";
  return "Une erreur est survenue";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Vérifier l'authentification
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      throw new Error("Non autorisé");
    }

    // Valider le corps de la requête
    const rawBody = await req.json();
    const validationResult = requestSchema.safeParse(rawBody);
    
    if (!validationResult.success) {
      console.error("[VALIDATION]", validationResult.error.issues);
      return new Response(
        JSON.stringify({ error: "Invalid request format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { campaignId }: RequestBody = validationResult.data;

    // Récupérer la campagne
    const { data: campaign, error: campaignError } = await supabaseClient
      .from("campaigns")
      .select("*")
      .eq("id", campaignId)
      .eq("user_id", user.id)
      .single();

    if (campaignError || !campaign) {
      throw new Error("Campagne introuvable");
    }

    // Récupérer le profil utilisateur
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    // Récupérer les entreprises sauvegardées
    const { data: companies, error: companiesError } = await supabaseClient
      .from("companies")
      .select("*")
      .eq("user_id", user.id);

    if (companiesError || !companies || companies.length === 0) {
      throw new Error("Aucune entreprise sauvegardée");
    }

    // Récupérer la blacklist
    const { data: blacklist } = await supabaseClient
      .from("user_company_blacklist")
      .select("company_siren")
      .eq("user_id", user.id);

    const blacklistedSirens = blacklist?.map(b => b.company_siren) || [];

    // Filtrer les entreprises non blacklistées
    const targetCompanies = companies.filter(c => !blacklistedSirens.includes(c.siren));

    if (targetCompanies.length === 0) {
      throw new Error("Toutes les entreprises ont déjà été contactées");
    }

    const emailsPerDay = campaign.emails_per_day || 40;
    const delayBetweenEmails = (campaign.delay_between_emails || 45) * 60 * 1000; // Convert to ms

    let sentCount = 0;
    let failedCount = 0;
    let smtpClient: SMTPClient | null = null;

    // Mettre à jour le statut de la campagne
    await supabaseClient
      .from("campaigns")
      .update({ 
        status: "sending",
        total_emails: targetCompanies.length
      })
      .eq("id", campaignId);

    try {
      // Vérifier si on a des emails à envoyer
      const companiesWithEmails = targetCompanies.filter(c => {
        const emails = c.emails as string[] || [];
        return emails.length > 0;
      });

      if (companiesWithEmails.length === 0) {
        throw new Error("Aucune entreprise n'a d'email. Veuillez d'abord rechercher les emails des entreprises.");
      }

      // Créer le client SMTP uniquement si on a des emails à envoyer
      smtpClient = new SMTPClient({
        connection: {
          hostname: Deno.env.get("SMTP_HOST") || "smtp.gmail.com",
          port: parseInt(Deno.env.get("SMTP_PORT") || "587"),
          tls: true,
          auth: {
            username: Deno.env.get("SMTP_USER") || "",
            password: Deno.env.get("SMTP_PASSWORD") || "",
          },
        },
      });

      // Envoyer les emails (limité au nombre par jour)
      for (let i = 0; i < Math.min(targetCompanies.length, emailsPerDay); i++) {
        const company = targetCompanies[i];
        
        // Personnaliser l'email
        let emailBody = campaign.body_template;
        emailBody = emailBody.replace(/{nom_entreprise}/g, company.nom);
        if (profile?.full_name) {
          const [prenom, ...nomParts] = profile.full_name.split(" ");
          emailBody = emailBody.replace(/{prenom}/g, prenom);
          emailBody = emailBody.replace(/{nom}/g, nomParts.join(" "));
        }

        try {
          // Récupérer les emails de l'entreprise
          const emails = company.emails as string[] || [];
          
          if (emails.length === 0) {
            console.log(`Aucun email pour ${company.nom}`);
            failedCount++;
            
            await supabaseClient.from("email_logs").insert({
              campaign_id: campaignId,
              company_id: company.id,
              recipient_email: "no-email",
              status: "failed",
              error_message: "Aucun email disponible",
            });
            
            continue;
          }

          // Envoyer à tous les emails de l'entreprise
          for (const recipientEmail of emails) {
            await smtpClient!.send({
              from: Deno.env.get("SMTP_USER") || "",
              to: recipientEmail,
              subject: campaign.subject,
              content: emailBody,
              html: emailBody.replace(/\n/g, "<br>"),
            });

            console.log(`Email envoyé à ${recipientEmail} (${company.nom})`);

            // Logger l'envoi
            await supabaseClient.from("email_logs").insert({
              campaign_id: campaignId,
              company_id: company.id,
              recipient_email: recipientEmail,
              status: "sent",
              sent_at: new Date().toISOString(),
            });
          }

          sentCount++;

          // Ajouter à la blacklist
          await supabaseClient.from("user_company_blacklist").insert({
            user_id: user.id,
            company_siren: company.siren,
          });

          // Attendre avant l'envoi suivant
          if (i < Math.min(targetCompanies.length, emailsPerDay) - 1) {
            await new Promise(resolve => setTimeout(resolve, delayBetweenEmails));
          }
        } catch (error: any) {
          const safeError = sanitizeError(error);
          console.error(`[EMAIL_ERROR] Company: ${company.nom}`, safeError);
          failedCount++;

          await supabaseClient.from("email_logs").insert({
            campaign_id: campaignId,
            company_id: company.id,
            recipient_email: company.emails?.[0] || "unknown",
            status: "failed",
            error_message: safeError.message,
          });
        }
      }
    } finally {
      // Fermer le client SMTP seulement s'il a été créé
      if (smtpClient) {
        try {
          await smtpClient.close();
        } catch (error: any) {
          const safeError = sanitizeError(error);
          console.error("[SMTP_CLOSE]", safeError);
        }
      }
    }

    // Mettre à jour les stats de la campagne
    await supabaseClient
      .from("campaigns")
      .update({
        status: sentCount === targetCompanies.length ? "completed" : "paused",
        sent_emails: campaign.sent_emails + sentCount,
        failed_emails: campaign.failed_emails + failedCount,
      })
      .eq("id", campaignId);

    return new Response(
      JSON.stringify({
        success: true,
        message: `${sentCount} email(s) envoyé(s), ${failedCount} échec(s)`,
        sent: sentCount,
        failed: failedCount,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    const safeError = sanitizeError(error);
    console.error("[INTERNAL]", safeError);
    return new Response(
      JSON.stringify({ error: mapToUserError(error) }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
