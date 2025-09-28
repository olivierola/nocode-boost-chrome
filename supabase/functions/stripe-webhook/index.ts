import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) throw new Error("No Stripe signature found");

    logStep("Verifying webhook signature");
    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      logStep("Webhook signature verification failed", { error: err instanceof Error ? err.message : 'Unknown error' });
      return new Response(`Webhook Error: ${err instanceof Error ? err.message : 'Unknown error'}`, { status: 400 });
    }

    logStep("Webhook event type", { type: event.type });

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await handleSubscriptionEvent(event.data.object as Stripe.Subscription, supabaseClient);
        break;
      
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session, stripe, supabaseClient);
        break;

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice, stripe, supabaseClient);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice, stripe, supabaseClient);
        break;

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in webhook", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

async function handleSubscriptionEvent(subscription: Stripe.Subscription, supabaseClient: any) {
  logStep("Handling subscription event", { subscriptionId: subscription.id, status: subscription.status });

  const customer = await getCustomerEmail(subscription.customer as string, supabaseClient);
  if (!customer) return;

  const isActive = subscription.status === 'active';
  const subscriptionTier = getSubscriptionTier(subscription);
  const subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();

  await supabaseClient.from("subscribers").upsert({
    email: customer.email,
    user_id: customer.user_id,
    stripe_customer_id: subscription.customer,
    subscribed: isActive,
    subscription_tier: isActive ? subscriptionTier : 'free',
    subscription_end: isActive ? subscriptionEnd : null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'email' });

  logStep("Updated subscription in database", { email: customer.email, subscribed: isActive, tier: subscriptionTier });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session, stripe: Stripe, supabaseClient: any) {
  logStep("Handling checkout completed", { sessionId: session.id });

  if (session.mode === 'subscription' && session.subscription) {
    const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
    await handleSubscriptionEvent(subscription, supabaseClient);
  }
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice, stripe: Stripe, supabaseClient: any) {
  logStep("Handling payment succeeded", { invoiceId: invoice.id });

  if (invoice.subscription) {
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
    await handleSubscriptionEvent(subscription, supabaseClient);
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice, stripe: Stripe, supabaseClient: any) {
  logStep("Handling payment failed", { invoiceId: invoice.id });

  const customer = await getCustomerEmail(invoice.customer as string, supabaseClient);
  if (!customer) return;

  // Mark subscription as failed or suspended
  await supabaseClient.from("subscribers").upsert({
    email: customer.email,
    user_id: customer.user_id,
    stripe_customer_id: invoice.customer,
    subscribed: false,
    subscription_tier: 'free',
    subscription_end: null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'email' });

  logStep("Marked subscription as failed", { email: customer.email });
}

async function getCustomerEmail(customerId: string, supabaseClient: any) {
  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2023-10-16" });
  
  try {
    const customer = await stripe.customers.retrieve(customerId);
    if (customer.deleted) return null;
    
    const email = (customer as Stripe.Customer).email;
    if (!email) return null;

    // Try to find user_id from profiles
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("user_id")
      .eq("email", email)
      .single();

    return {
      email,
      user_id: profile?.user_id || null
    };
  } catch (error) {
    logStep("Error retrieving customer", { customerId, error: error instanceof Error ? error.message : 'Unknown error' });
    return null;
  }
}

function getSubscriptionTier(subscription: Stripe.Subscription): string {
  if (!subscription.items.data[0]) return 'free';
  
  const price = subscription.items.data[0].price;
  const amount = price.unit_amount || 0;

  if (amount <= 999) return 'starter';
  if (amount <= 4999) return 'pro';
  return 'enterprise';
}