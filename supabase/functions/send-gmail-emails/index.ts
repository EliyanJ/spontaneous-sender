import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation schema
const emailSchema = z.object({
  recipients: z.array(z.string().email()).min(1).max(100),
  subject: z.string().min(1).max(200).refine(
    (s) => !/[\r\n]/.test(s),
    { message: "Subject cannot contain newlines" }
  ),
  body: z.string().min(1).max(100000),
  attachments: z.array(z.object({
    filename: z.string().min(1).max(255),
    contentType: z.string().regex(/^[a-z]+\/[a-z0-9+.-]+$/),
    data: z.string().max(10485760) // 10MB base64
  })).max(10).optional()
});

// Rate limiting function
async function checkRateLimit(supabase: any, userId: string, action: string, limit: number = 100) {
  const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
  
  const { count, error } = await supabase
    .from('rate_limits')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('action', action)
    .gte('created_at', oneHourAgo);
    
  if (error) {
    console.error('Rate limit check error:', error);
    return; // Fail open
  }
  
  if (count && count >= limit) {
    throw new Error(`Rate limit exceeded. Maximum ${limit} requests per hour for ${action}`);
  }
  
  // Record this request
  await supabase.from('rate_limits').insert({
    user_id: userId,
    action,
    count: 1
  });
}

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

    // Validate input
    const requestBody = await req.json();
    const validationResult = emailSchema.safeParse(requestBody);
    
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ 
          error: "Invalid input", 
          details: validationResult.error.issues.map(i => i.message) 
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    const { recipients, subject, body: rawBody, attachments } = validationResult.data;

    // Formater le body avec des retours à la ligne HTML
    const body = rawBody.replace(/\n/g, '<br>');

    // Check rate limit
    await checkRateLimit(supabaseClient, user.id, 'send-gmail-emails', 50);

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
      
      // Rafraîchir le token en appelant l'edge function dédiée
      console.log("Token expiré, rafraîchissement via refresh-gmail-token...");
      
      const { data: refreshData, error: refreshError } = await supabaseClient.functions.invoke(
        'refresh-gmail-token',
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (refreshError || !refreshData?.access_token) {
        console.error("Failed to refresh Gmail token:", refreshError);
        throw new Error("Failed to refresh Gmail token. Please reconnect Gmail.");
      }

      accessToken = refreshData.access_token;
      console.log("Token rafraîchi avec succès");


      console.log("Token refreshed successfully");
    }

    // Envoyer les emails
    let successCount = 0;
    let failureCount = 0;
    const errors: string[] = [];

      for (const recipient of recipients) {
        try {
          const encodedSubject = `=?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;
          let emailContent = [
            `To: ${recipient}`,
            `Subject: ${encodedSubject}`,
            "MIME-Version: 1.0",
            'Content-Type: text/html; charset=utf-8',
            "",
            body,
          ].join("\r\n");

        // Handle attachments if present
        if (attachments && attachments.length > 0) {
          const boundary = "boundary_" + Math.random().toString(36).substring(7);
          emailContent = [
            `To: ${recipient}`,
            `Subject: ${encodedSubject}`,
            "MIME-Version: 1.0",
            `Content-Type: multipart/mixed; boundary="${boundary}"`,
            "",
            `--${boundary}`,
            'Content-Type: text/html; charset=utf-8',
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