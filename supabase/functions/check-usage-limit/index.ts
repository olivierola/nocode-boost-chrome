import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-USAGE-LIMIT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const { action_type } = await req.json();
    
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
    if (!user?.id) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    // Check usage limit using database function
    const { data: canProceed, error: limitError } = await supabaseClient
      .rpc('check_usage_limit', {
        p_user_id: user.id,
        p_action_type: action_type
      });

    if (limitError) {
      logStep("Error checking usage limit", { error: limitError });
      throw new Error("Failed to check usage limit");
    }

    logStep("Usage limit check completed", { canProceed, action_type });

    // Get current usage and plan info for response
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
    
    const { data: usage, error: usageError } = await supabaseClient
      .from('usage_tracking')
      .select('*')
      .eq('user_id', user.id)
      .eq('action_type', action_type)
      .eq('month_year', currentMonth);

    if (usageError) {
      logStep("Error fetching usage data", { error: usageError });
    }

    const { data: subscriber, error: subError } = await supabaseClient
      .from('subscribers')
      .select('subscription_tier')
      .eq('user_id', user.id)
      .single();

    const planTier = subscriber?.subscription_tier || 'free';

    const { data: planLimits, error: planError } = await supabaseClient
      .from('subscription_plans')
      .select('*')
      .eq('name', planTier)
      .single();

    let currentLimit = 0;
    if (planLimits) {
      switch (action_type) {
        case 'plan_generation':
          currentLimit = planLimits.monthly_plan_generations;
          break;
        case 'visual_identity':
          currentLimit = planLimits.monthly_visual_identity;
          break;
        case 'media_upload':
          currentLimit = planLimits.monthly_media_uploads;
          break;
      }
    }

    return new Response(JSON.stringify({
      can_proceed: canProceed,
      current_usage: usage?.length || 0,
      limit: currentLimit === -1 ? 'unlimited' : currentLimit,
      plan_tier: planTier
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-usage-limit", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});