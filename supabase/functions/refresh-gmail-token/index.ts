import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";
import { decryptToken, encryptToken } from "../_shared/crypto.ts";

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

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const { data: tokenData, error: fetchError } = await supabase
      .from("gmail_tokens")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (fetchError || !tokenData) {
      throw new Error("No tokens found for user");
    }

    if (!tokenData.refresh_token) {
      throw new Error("No refresh token available");
    }

    // Decrypt refresh token
    const decryptedRefreshToken = await decryptToken(tokenData.refresh_token);

    const clientId = Deno.env.get("GMAIL_CLIENT_ID");
    const clientSecret = Deno.env.get("GMAIL_CLIENT_SECRET");

    console.log("Refreshing Gmail token for user:", user.id);

    const refreshResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId!,
        client_secret: clientSecret!,
        refresh_token: decryptedRefreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!refreshResponse.ok) {
      const errorData = await refreshResponse.json().catch(() => ({}));
      console.error("Error refreshing token:", JSON.stringify(errorData));
      
      if (errorData.error === "invalid_grant") {
        console.log("Token revoked or expired, deleting invalid tokens for user:", user.id);
        await supabase
          .from("gmail_tokens")
          .delete()
          .eq("user_id", user.id);
        
        throw new Error("Gmail token has been revoked or expired. Please reconnect your Gmail account.");
      }
      
      throw new Error("Failed to refresh token");
    }

    const refreshData = await refreshResponse.json();
    const newAccessToken = refreshData.access_token;

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    // Encrypt new access token before storing
    const encryptedAccessToken = await encryptToken(newAccessToken);

    const { error: updateError } = await supabase
      .from("gmail_tokens")
      .update({
        access_token: encryptedAccessToken,
        expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    if (updateError) {
      console.error("Error updating token:", updateError);
      throw updateError;
    }

    console.log("Gmail token refreshed successfully");

    return new Response(
      JSON.stringify({ 
        success: true, 
        access_token: newAccessToken,
        message: "Token refreshed successfully" 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error in refresh-gmail-token:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
