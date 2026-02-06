import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Feature disabled - requires gmail.readonly scope which is not available
// To re-enable this feature:
// 1. Add gmail.readonly scope to Google Cloud Console
// 2. Pass the CASA security audit (€3,000 - €75,000)
// 3. Restore the original code from git history

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("sync-gmail-history: Feature disabled - gmail.readonly scope not available");

  return new Response(
    JSON.stringify({
      success: true,
      message: "Feature disabled - gmail.readonly scope not available",
      syncedCount: 0,
      totalProcessed: 0,
      syncedEmails: [],
    }),
    {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    }
  );
});
