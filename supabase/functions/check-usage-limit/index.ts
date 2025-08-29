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
    logStep("Action type received", { action_type });

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    // Check if user can proceed with this action
    const { data: canProceed, error: checkError } = await supabaseClient
      .rpc('check_usage_limit', {
        p_user_id: user.id,
        p_action_type: action_type
      });

    if (checkError) {
      logStep("Error checking usage limit", { error: checkError });
      throw checkError;
    }

    // Get current usage count
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
    const { data: usageData, error: usageError } = await supabaseClient
      .from('usage_tracking')
      .select('*')
      .eq('user_id', user.id)
      .eq('action_type', action_type)
      .eq('month_year', currentMonth);

    if (usageError) {
      logStep("Error fetching usage data", { error: usageError });
      throw usageError;
    }

    const currentUsage = usageData?.length || 0;

    // Get user's plan limits
    const { data: planData, error: planError } = await supabaseClient
      .rpc('get_user_plan_limits', { user_email: user.email });

    if (planError) {
      logStep("Error fetching plan limits", { error: planError });
      throw planError;
    }

    const planLimits = planData?.[0];
    if (!planLimits) {
      throw new Error("No plan found for user");
    }

    let limit;
    switch (action_type) {
      case 'plan_generation':
        limit = planLimits.monthly_plan_generations;
        break;
      case 'visual_identity':
        limit = planLimits.monthly_visual_identity;
        break;
      case 'media_upload':
        limit = planLimits.monthly_media_uploads;
        break;
      default:
        throw new Error("Invalid action type");
    }

    logStep("Usage check completed", { 
      can_proceed: canProceed,
      current_usage: currentUsage,
      limit: limit,
      plan_tier: planLimits.plan_name
    });

    return new Response(JSON.stringify({
      can_proceed: canProceed,
      current_usage: currentUsage,
      limit: limit === -1 ? "unlimited" : limit,
      plan_tier: planLimits.plan_name
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