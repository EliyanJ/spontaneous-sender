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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Vérifier l'authentification
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

    // Check if this is a new Gmail connection (not an existing one)
    const { data: existingToken } = await supabase
      .from("gmail_tokens")
      .select("id")
      .eq("user_id", user.id)
      .single();

    const isNewConnection = !existingToken;

    // Calculer l'expiration (tokens Google expirent en 1h)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    // Upsert les tokens dans la table gmail_tokens
    const { error: upsertError } = await supabase
      .from("gmail_tokens")
      .upsert({
        user_id: user.id,
        access_token: provider_token,
        refresh_token: provider_refresh_token,
        expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id'
      });

    if (upsertError) {
      console.error("Error storing tokens:", upsertError);
      throw upsertError;
    }

    console.log("Gmail tokens stored successfully");

    // Send security notification email for new connections
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
        // Don't fail the token storage if email fails
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
