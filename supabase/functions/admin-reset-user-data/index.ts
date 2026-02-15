import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const adminId = claimsData.claims.sub as string;

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: isAdmin } = await adminClient.rpc("has_role", { _user_id: adminId, _role: "admin" });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });
    }

    const { userId, resetType } = await req.json();
    if (!userId || !resetType) {
      return new Response(JSON.stringify({ error: "userId and resetType are required" }), { status: 400, headers: corsHeaders });
    }

    const results: Record<string, string> = {};

    if (resetType === "gmail") {
      const { error: e1 } = await adminClient.from("gmail_tokens").delete().eq("user_id", userId);
      results["gmail_tokens"] = e1 ? e1.message : "deleted";
      const { error: e2 } = await adminClient.from("gmail_watch_config").delete().eq("user_id", userId);
      results["gmail_watch_config"] = e2 ? e2.message : "deleted";
    } else if (resetType === "companies") {
      // Delete email_responses first (FK to email_campaigns)
      const { error: e0 } = await adminClient.from("email_responses").delete().eq("user_id", userId);
      results["email_responses"] = e0 ? e0.message : "deleted";

      // Delete email_campaigns (FK to companies)
      const { error: e1 } = await adminClient.from("email_campaigns").delete().eq("user_id", userId);
      results["email_campaigns"] = e1 ? e1.message : "deleted";

      // Delete email_logs via campaigns
      const { data: campaignIds } = await adminClient.from("campaigns").select("id").eq("user_id", userId);
      if (campaignIds && campaignIds.length > 0) {
        await adminClient.from("email_logs").delete().in("campaign_id", campaignIds.map((c: { id: string }) => c.id));
      }
      results["email_logs"] = "deleted";

      const { error: e2 } = await adminClient.from("companies").delete().eq("user_id", userId);
      results["companies"] = e2 ? e2.message : "deleted";
      const { error: e3 } = await adminClient.from("user_company_blacklist").delete().eq("user_id", userId);
      results["user_company_blacklist"] = e3 ? e3.message : "deleted";
    } else if (resetType === "subscription") {
      const { error } = await adminClient
        .from("subscriptions")
        .update({
          plan_type: "free",
          status: "active",
          sends_remaining: 5,
          sends_limit: 5,
          tokens_remaining: 0,
          stripe_subscription_id: null,
          stripe_customer_id: null,
          current_period_start: null,
          current_period_end: null,
        })
        .eq("user_id", userId);
      results["subscriptions"] = error ? error.message : "reset to free";
    } else {
      return new Response(JSON.stringify({ error: "Invalid resetType. Use: gmail, companies, subscription" }), {
        status: 400, headers: corsHeaders,
      });
    }

    // Log admin action
    await adminClient.from("user_activity_logs").insert({
      user_id: adminId,
      action_type: "admin_reset_user_data",
      action_data: { target_user_id: userId, reset_type: resetType, results },
      session_id: `admin-action-${Date.now()}`,
    });

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
