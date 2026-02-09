import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";
import { encryptToken } from "../_shared/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * One-time migration function to encrypt existing plaintext Gmail tokens.
 * Tokens already encrypted (starting with "enc:") are skipped.
 * Call with x-cron-secret header for authentication.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const cronSecret = req.headers.get('x-cron-secret');
  if (cronSecret !== Deno.env.get('CRON_SECRET')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch all tokens
    const { data: tokens, error } = await supabase
      .from("gmail_tokens")
      .select("id, user_id, access_token, refresh_token");

    if (error) throw error;

    let migrated = 0;
    let skipped = 0;

    for (const token of tokens || []) {
      // Skip already encrypted tokens
      if (token.access_token?.startsWith("enc:")) {
        skipped++;
        continue;
      }

      const encryptedAccess = await encryptToken(token.access_token);
      const encryptedRefresh = token.refresh_token
        ? await encryptToken(token.refresh_token)
        : null;

      const { error: updateError } = await supabase
        .from("gmail_tokens")
        .update({
          access_token: encryptedAccess,
          refresh_token: encryptedRefresh,
          updated_at: new Date().toISOString(),
        })
        .eq("id", token.id);

      if (updateError) {
        console.error(`Failed to encrypt tokens for user ${token.user_id}:`, updateError);
      } else {
        migrated++;
        console.log(`Encrypted tokens for user ${token.user_id}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        total: tokens?.length || 0,
        migrated,
        skipped,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: any) {
    console.error("Migration error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
