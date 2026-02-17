import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@18.5.0";

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
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

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

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const { action, ...params } = await req.json();

    if (action === "list") {
      const [coupons, promoCodes] = await Promise.all([
        stripe.coupons.list({ limit: 50 }),
        stripe.promotionCodes.list({ limit: 100, expand: ["data.coupon"] }),
      ]);

      return new Response(JSON.stringify({
        coupons: coupons.data,
        promoCodes: promoCodes.data,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (action === "create_coupon") {
      const { name, percent_off, amount_off, currency, duration, duration_in_months } = params;
      
      const couponParams: any = { name, duration: duration || "once" };
      if (percent_off) couponParams.percent_off = percent_off;
      else if (amount_off) {
        couponParams.amount_off = amount_off;
        couponParams.currency = currency || "eur";
      }
      if (duration === "repeating" && duration_in_months) {
        couponParams.duration_in_months = duration_in_months;
      }

      const coupon = await stripe.coupons.create(couponParams);

      return new Response(JSON.stringify({ coupon }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (action === "create_promo_code") {
      const { coupon_id, code, max_redemptions } = params;
      
      const promoParams: any = { coupon: coupon_id, code: code.toUpperCase() };
      if (max_redemptions) promoParams.max_redemptions = max_redemptions;

      const promoCode = await stripe.promotionCodes.create(promoParams);

      return new Response(JSON.stringify({ promoCode }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (action === "deactivate_promo") {
      const { promo_id } = params;
      const updated = await stripe.promotionCodes.update(promo_id, { active: false });

      return new Response(JSON.stringify({ promoCode: updated }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else {
      return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400, headers: corsHeaders });
    }

  } catch (error) {
    console.error("[ADMIN-MANAGE-PROMOS] Error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
