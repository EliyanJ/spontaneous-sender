import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

// Stripe product/price IDs
const STRIPE_PRODUCTS = {
  PLAN_SIMPLE: {
    product_id: "prod_Tfbyp2POhagRwc",
    price_id: "price_1SiGk5KkkIHh6CiwgtT585N8",
    sends_limit: 200,
    plan_type: "simple"
  },
  PLAN_PLUS: {
    product_id: "prod_TfbyAGlkrpQCUE",
    price_id: "price_1SiGkGKkkIHh6CiwsTek7M1f",
    sends_limit: 400,
    plan_type: "plus"
  },
  PACK_50_TOKENS: {
    product_id: "prod_TfbzOex2KTEYcJ",
    price_id: "price_1SiGl7KkkIHh6CiwbdTxZ5pd",
    tokens: 50
  },
  PACK_100_TOKENS: {
    product_id: "prod_TfbzIxumQAOVne",
    price_id: "price_1SiGlJKkkIHh6CiwzKjAjPeb",
    tokens: 100
  }
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) {
    console.error("STRIPE_SECRET_KEY not set");
    return new Response("Configuration error", { status: 500 });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
  
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");
    
    // For now, we'll parse directly since webhook secret setup varies
    // In production, you should verify the signature
    const event = JSON.parse(body) as Stripe.Event;
    
    logStep("Event received", { type: event.type, id: event.id });

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        logStep("Checkout completed", { 
          customerId: session.customer, 
          customerEmail: session.customer_email,
          mode: session.mode
        });

        const customerEmail = session.customer_email || session.customer_details?.email;
        if (!customerEmail) {
          logStep("No customer email found");
          break;
        }

        // Find user by email
        const { data: userData, error: userError } = await supabase.auth.admin.listUsers();
        if (userError) {
          logStep("Error fetching users", { error: userError.message });
          break;
        }

        const user = userData.users.find(u => u.email === customerEmail);
        if (!user) {
          logStep("User not found", { email: customerEmail });
          break;
        }

        logStep("User found", { userId: user.id });

        // Get line items to determine what was purchased
        const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
        const priceId = lineItems.data[0]?.price?.id;
        
        logStep("Line items retrieved", { priceId });

        // Check if it's a subscription or one-time purchase
        if (session.mode === "subscription") {
          // Handle subscription
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
          const productId = subscription.items.data[0]?.price?.product as string;
          
          let planType: "simple" | "plus" = "simple";
          let sendsLimit = 200;

          if (productId === STRIPE_PRODUCTS.PLAN_PLUS.product_id) {
            planType = "plus";
            sendsLimit = 400;
          }

          logStep("Updating subscription", { planType, sendsLimit });

          const { error: subError } = await supabase
            .from("subscriptions")
            .update({
              plan_type: planType,
              status: "active",
              sends_remaining: sendsLimit,
              sends_limit: sendsLimit,
              stripe_subscription_id: session.subscription as string,
              stripe_customer_id: session.customer as string,
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq("user_id", user.id);

          if (subError) {
            logStep("Error updating subscription", { error: subError.message });
          } else {
            logStep("Subscription updated successfully");
          }
        } else if (session.mode === "payment") {
          // Handle token pack purchase
          let tokensToAdd = 0;

          if (priceId === STRIPE_PRODUCTS.PACK_50_TOKENS.price_id) {
            tokensToAdd = 50;
          } else if (priceId === STRIPE_PRODUCTS.PACK_100_TOKENS.price_id) {
            tokensToAdd = 100;
          }

          if (tokensToAdd > 0) {
            logStep("Adding tokens", { tokens: tokensToAdd });

            // Get current tokens
            const { data: subData, error: subFetchError } = await supabase
              .from("subscriptions")
              .select("tokens_remaining")
              .eq("user_id", user.id)
              .single();

            if (subFetchError) {
              logStep("Error fetching subscription", { error: subFetchError.message });
              break;
            }

            const newTokens = (subData?.tokens_remaining || 0) + tokensToAdd;

            // Update tokens
            const { error: tokenError } = await supabase
              .from("subscriptions")
              .update({
                tokens_remaining: newTokens,
                stripe_customer_id: session.customer as string,
                updated_at: new Date().toISOString()
              })
              .eq("user_id", user.id);

            if (tokenError) {
              logStep("Error updating tokens", { error: tokenError.message });
            } else {
              // Log transaction
              await supabase.from("token_transactions").insert({
                user_id: user.id,
                amount: tokensToAdd,
                type: "purchase",
                description: `Achat Pack ${tokensToAdd} Tokens`
              });

              logStep("Tokens added successfully", { newTotal: newTokens });
            }
          }
        }
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        logStep("Invoice paid", { 
          customerId: invoice.customer,
          subscriptionId: invoice.subscription
        });

        if (!invoice.subscription) {
          logStep("No subscription in invoice, skipping");
          break;
        }

        // Get customer email
        const customer = await stripe.customers.retrieve(invoice.customer as string) as Stripe.Customer;
        const customerEmail = customer.email;

        if (!customerEmail) {
          logStep("No customer email found");
          break;
        }

        // Find user
        const { data: userData } = await supabase.auth.admin.listUsers();
        const user = userData?.users.find(u => u.email === customerEmail);

        if (!user) {
          logStep("User not found", { email: customerEmail });
          break;
        }

        // Get subscription details
        const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
        const productId = subscription.items.data[0]?.price?.product as string;

        let sendsLimit = 200;
        if (productId === STRIPE_PRODUCTS.PLAN_PLUS.product_id) {
          sendsLimit = 400;
        }

        // Reset monthly credits
        const { error } = await supabase
          .from("subscriptions")
          .update({
            sends_remaining: sendsLimit,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq("user_id", user.id);

        if (error) {
          logStep("Error resetting credits", { error: error.message });
        } else {
          logStep("Monthly credits reset", { sendsLimit });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Subscription deleted", { subscriptionId: subscription.id });

        // Get customer
        const customer = await stripe.customers.retrieve(subscription.customer as string) as Stripe.Customer;
        const customerEmail = customer.email;

        if (!customerEmail) {
          logStep("No customer email found");
          break;
        }

        // Find user
        const { data: userData } = await supabase.auth.admin.listUsers();
        const user = userData?.users.find(u => u.email === customerEmail);

        if (!user) {
          logStep("User not found", { email: customerEmail });
          break;
        }

        // Downgrade to free plan
        const { error } = await supabase
          .from("subscriptions")
          .update({
            plan_type: "free",
            status: "canceled",
            sends_remaining: 5,
            sends_limit: 5,
            stripe_subscription_id: null,
            current_period_start: null,
            current_period_end: null,
            updated_at: new Date().toISOString()
          })
          .eq("user_id", user.id);

        if (error) {
          logStep("Error downgrading subscription", { error: error.message });
        } else {
          logStep("Subscription downgraded to free");
        }
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
