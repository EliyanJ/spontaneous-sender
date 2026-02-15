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

    // Verify caller is admin
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const adminId = claimsData.claims.sub as string;

    // Use service role client for admin operations
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Check admin role
    const { data: isAdmin } = await adminClient.rpc("has_role", { _user_id: adminId, _role: "admin" });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden: admin role required" }), { status: 403, headers: corsHeaders });
    }

    const { userId } = await req.json();
    if (!userId) {
      return new Response(JSON.stringify({ error: "userId is required" }), { status: 400, headers: corsHeaders });
    }

    // Prevent self-deletion
    if (userId === adminId) {
      return new Response(JSON.stringify({ error: "Cannot delete your own admin account" }), { status: 400, headers: corsHeaders });
    }

    // Delete all user data from tables (order matters for foreign keys)
    const tables = [
      { table: "email_responses", column: "user_id" },
      { table: "email_logs", column: null }, // needs special handling via campaigns
      { table: "email_campaigns", column: "user_id" },
      { table: "campaigns", column: "user_id" },
      { table: "scheduled_emails", column: "user_id" },
      { table: "companies", column: "user_id" },
      { table: "gmail_tokens", column: "user_id" },
      { table: "gmail_watch_config", column: "user_id" },
      { table: "job_queue", column: "user_id" },
      { table: "user_activity_logs", column: "user_id" },
      { table: "user_company_blacklist", column: "user_id" },
      { table: "user_preferences", column: "user_id" },
      { table: "user_email_templates", column: "user_id" },
      { table: "user_cv_profiles", column: "user_id" },
      { table: "user_notifications", column: "user_id" },
      { table: "token_transactions", column: "user_id" },
      { table: "referrals", column: "referrer_id" },
      { table: "support_tickets", column: "user_id" },
      { table: "subscriptions", column: "user_id" },
      { table: "user_roles", column: "user_id" },
      { table: "rate_limits", column: "user_id" },
      { table: "profiles", column: "id" },
    ];

    const deletionResults: Record<string, string> = {};

    // Delete email_logs via campaigns first
    const { data: campaignIds } = await adminClient
      .from("campaigns")
      .select("id")
      .eq("user_id", userId);

    if (campaignIds && campaignIds.length > 0) {
      const ids = campaignIds.map((c: { id: string }) => c.id);
      const { error } = await adminClient.from("email_logs").delete().in("campaign_id", ids);
      deletionResults["email_logs"] = error ? `error: ${error.message}` : "deleted";
    } else {
      deletionResults["email_logs"] = "no data";
    }

    // Also delete referrals where user is referred
    await adminClient.from("referrals").delete().eq("referred_id", userId);

    for (const { table, column } of tables) {
      if (!column) continue; // email_logs already handled
      try {
        const { error } = await adminClient.from(table).delete().eq(column, userId);
        deletionResults[table] = error ? `error: ${error.message}` : "deleted";
      } catch (e) {
        deletionResults[table] = `exception: ${(e as Error).message}`;
      }
    }

    // Delete auth user
    const { error: authError } = await adminClient.auth.admin.deleteUser(userId);
    deletionResults["auth.users"] = authError ? `error: ${authError.message}` : "deleted";

    // Log the admin action
    await adminClient.from("user_activity_logs").insert({
      user_id: adminId,
      action_type: "admin_delete_user",
      action_data: { deleted_user_id: userId, results: deletionResults },
      session_id: `admin-action-${Date.now()}`,
    });

    return new Response(JSON.stringify({ success: true, results: deletionResults }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
