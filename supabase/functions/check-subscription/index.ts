import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Stripe product IDs
const STRIPE_PRODUCTS = {
  PLAN_SIMPLE: "prod_Tfbyp2POhagRwc",
  PLAN_PLUS: "prod_TfbyAGlkrpQCUE",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Find Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No Stripe customer found, returning free plan");
      return new Response(JSON.stringify({ 
        subscribed: false,
        plan_type: "free",
        subscription_end: null
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Stripe customer found", { customerId });

    // Check for active subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      logStep("No active subscription found");
      
      // Sync with database
      await supabaseClient
        .from("subscriptions")
        .update({
          plan_type: "free",
          status: "active",
          stripe_customer_id: customerId,
          updated_at: new Date().toISOString()
        })
        .eq("user_id", user.id);

      return new Response(JSON.stringify({ 
        subscribed: false,
        plan_type: "free",
        subscription_end: null
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const subscription = subscriptions.data[0];
    const productId = subscription.items.data[0]?.price?.product as string;
    const subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();

    let planType: "simple" | "plus" = "simple";
    let sendsLimit = 200;

    if (productId === STRIPE_PRODUCTS.PLAN_PLUS) {
      planType = "plus";
      sendsLimit = 400;
    }

    logStep("Active subscription found", { planType, productId, subscriptionEnd });

    // Sync with database
    await supabaseClient
      .from("subscriptions")
      .update({
        plan_type: planType,
        status: "active",
        sends_limit: sendsLimit,
        stripe_subscription_id: subscription.id,
        stripe_customer_id: customerId,
        current_period_end: subscriptionEnd,
        updated_at: new Date().toISOString()
      })
      .eq("user_id", user.id);

    return new Response(JSON.stringify({
      subscribed: true,
      plan_type: planType,
      product_id: productId,
      subscription_end: subscriptionEnd
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
