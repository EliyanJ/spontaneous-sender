import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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

    const url = new URL(req.url);
    const code = url.searchParams.get("code");

    // Compute redirect URI dynamically from request origin/referer, fallback to secret
    const originHeader = req.headers.get("origin");
    const refererHeader = req.headers.get("referer");
    const detectedOrigin = originHeader || (refererHeader ? new URL(refererHeader).origin : "");
    const secretRedirect = Deno.env.get("GMAIL_REDIRECT_URI") || "";
    const secretOrigin = secretRedirect ? new URL(secretRedirect).origin : "";
    const baseOrigin = detectedOrigin || secretOrigin;
    const redirectUri = `${baseOrigin}/auth/gmail/callback`;

    if (!code) {
      const body = await req.json();
      if (body.code) {
        return handleEmailSend(supabaseClient, user.id, body.code, body, redirectUri);
      }

      const clientId = Deno.env.get("GMAIL_CLIENT_ID");
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=https://www.googleapis.com/auth/gmail.send&access_type=offline&prompt=consent`;

      return new Response(JSON.stringify({ authUrl, redirectUri, detectedOrigin, secretOrigin }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return handleEmailSend(supabaseClient, user.id, code, null, redirectUri);
  } catch (error: any) {
    console.error("Error in send-gmail-emails:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function handleEmailSend(
  supabaseClient: any,
  userId: string,
  code: string,
  emailData: any,
  redirectUri: string
) {
  const clientId = Deno.env.get("GMAIL_CLIENT_ID");
  const clientSecret = Deno.env.get("GMAIL_CLIENT_SECRET");

  console.log("Exchanging code for access token...");
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId!,
      client_secret: clientSecret!,
      redirect_uri: redirectUri!,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenResponse.ok) {
    const error = await tokenResponse.text();
    console.error("Token exchange failed:", error);
    throw new Error(`Failed to get access token: ${error}`);
  }

  const { access_token } = await tokenResponse.json();
  console.log("Access token obtained successfully");

  const { recipients, subject, body, attachments } = emailData || {};

  if (!recipients || !subject || !body) {
    throw new Error("Missing required email data");
  }

  console.log(`Sending emails to ${recipients.length} recipients...`);

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
            Authorization: `Bearer ${access_token}`,
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
}
