import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";
import { encryptToken } from "../_shared/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const { provider_token, provider_refresh_token } = await req.json();

    if (!provider_token) {
      throw new Error("Missing provider_token");
    }

    console.log("Storing Gmail tokens for user:", user.id);

    const { data: existingToken } = await supabase
      .from("gmail_tokens")
      .select("id")
      .eq("user_id", user.id)
      .single();

    const isNewConnection = !existingToken;

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    // Encrypt tokens before storing
    const encryptedAccessToken = await encryptToken(provider_token);
    const encryptedRefreshToken = provider_refresh_token 
      ? await encryptToken(provider_refresh_token) 
      : null;

    const { error: upsertError } = await supabase
      .from("gmail_tokens")
      .upsert({
        user_id: user.id,
        access_token: encryptedAccessToken,
        refresh_token: encryptedRefreshToken,
        expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id'
      });

    if (upsertError) {
      console.error("Error storing tokens:", upsertError);
      throw upsertError;
    }

    console.log("Gmail tokens stored successfully (encrypted)");

    if (isNewConnection && user.email) {
      try {
        await supabase.functions.invoke('send-system-email', {
          body: {
            type: 'gmail_connected',
            to: user.email,
            userEmail: user.email
          }
        });
        console.log("Gmail connection notification email sent");
      } catch (emailError) {
        console.error("Failed to send gmail_connected email:", emailError);
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: "Tokens stored successfully" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error in store-gmail-tokens:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
