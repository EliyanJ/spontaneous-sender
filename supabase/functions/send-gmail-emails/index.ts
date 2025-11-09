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

    // Récupérer les données de l'email
    const { recipients, subject, body, attachments } = await req.json();

    if (!recipients || !subject || !body) {
      throw new Error("Missing required email data");
    }

    console.log(`Sending emails to ${recipients.length} recipients...`);

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
      
      // Rafraîchir le token
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

    // Envoyer les emails
    let successCount = 0;
    let failureCount = 0;
    const errors: string[] = [];

    for (const recipient of recipients) {
      try {
        let emailContent = [
          `To: ${recipient}`,
          `Subject: ${subject}`,
          "MIME-Version: 1.0",
          'Content-Type: text/html; charset="UTF-8"',
          "",
          body,
        ].join("\r\n");

        // Handle attachments if present
        if (attachments && attachments.length > 0) {
          const boundary = "boundary_" + Math.random().toString(36).substring(7);
          emailContent = [
            `To: ${recipient}`,
            `Subject: ${subject}`,
            "MIME-Version: 1.0",
            `Content-Type: multipart/mixed; boundary="${boundary}"`,
            "",
            `--${boundary}`,
            'Content-Type: text/html; charset="UTF-8"',
            "",
            body,
            "",
          ].join("\r\n");

          for (const attachment of attachments) {
            emailContent += [
              `--${boundary}`,
              `Content-Type: ${attachment.contentType}`,
              "Content-Transfer-Encoding: base64",
              `Content-Disposition: attachment; filename="${attachment.filename}"`,
              "",
              attachment.data,
              "",
            ].join("\r\n");
          }

          emailContent += `--${boundary}--`;
        }

        const encodedEmail = btoa(unescape(encodeURIComponent(emailContent)))
          .replace(/\+/g, "-")
          .replace(/\//g, "_")
          .replace(/=+$/, "");

        const sendResponse = await fetch(
          "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              raw: encodedEmail,
            }),
          }
        );

        if (!sendResponse.ok) {
          const error = await sendResponse.text();
          console.error(`Failed to send email to ${recipient}:`, error);
          errors.push(`${recipient}: ${error}`);
          failureCount++;
        } else {
          console.log(`Email sent successfully to ${recipient}`);
          successCount++;
        }
      } catch (error: any) {
        console.error(`Error sending to ${recipient}:`, error);
        errors.push(`${recipient}: ${error.message}`);
        failureCount++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Emails sent: ${successCount} succeeded, ${failureCount} failed`,
        successCount,
        failureCount,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in send-gmail-emails:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});