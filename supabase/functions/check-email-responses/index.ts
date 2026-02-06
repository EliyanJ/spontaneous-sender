import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Feature disabled - requires gmail.readonly scope which is not available
// To re-enable this feature:
// 1. Add gmail.readonly scope to Google Cloud Console
// 2. Pass the CASA security audit (€3,000 - €75,000)
// 3. Restore the original code from git history

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Validate CRON_SECRET for security (keep for consistency)
  const cronSecret = req.headers.get('x-cron-secret');
  if (cronSecret !== Deno.env.get('CRON_SECRET')) {
    console.error('Unauthorized cron request - invalid or missing secret');
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  console.log('check-email-responses: Feature disabled - gmail.readonly scope not available');

  return new Response(
    JSON.stringify({
      success: true,
      message: 'Feature disabled - gmail.readonly scope not available',
      checked: 0,
      responsesFound: 0,
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    }
  );
});
