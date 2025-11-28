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

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    // Récupérer les tokens existants
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

    const clientId = Deno.env.get("GMAIL_CLIENT_ID");
    const clientSecret = Deno.env.get("GMAIL_CLIENT_SECRET");

    console.log("Refreshing Gmail token for user:", user.id);

    // Rafraîchir le token via l'API Google
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
      const errorData = await refreshResponse.json().catch(() => ({}));
      console.error("Error refreshing token:", JSON.stringify(errorData));
      
      // Si le token a été révoqué ou a expiré, supprimer les tokens invalides
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

    // Mettre à jour le token dans la base
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    const { error: updateError } = await supabase
      .from("gmail_tokens")
      .update({
        access_token: newAccessToken,
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