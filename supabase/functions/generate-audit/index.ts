import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://deno.land/x/supabase@1.0.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper function to call AI with fallback
async function callAIWithFallback(messages: any[], model: string, maxTokens: number, temperature: number) {
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  const groqApiKey = Deno.env.get('GROQ_API_KEY');

  // Try OpenAI first
  if (openAIApiKey) {
    try {
      console.log('Attempting OpenAI API call...');
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: maxTokens,
          temperature,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.choices[0].message.content;
      } else {
        const errorData = await response.text();
        console.log(`OpenAI failed with status ${response.status}: ${errorData}, trying Groq...`);
      }
    } catch (error) {
      console.log('OpenAI error:', error, ', trying Groq...');
    }
  }

  // Fallback to Groq
  if (groqApiKey) {
    try {
      console.log('Attempting Groq API call...');
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages,
          max_tokens: maxTokens,
          temperature,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.choices[0].message.content;
      } else {
        const errorData = await response.text();
        throw new Error(`Groq API error: ${response.status} - ${errorData}`);
      }
    } catch (error) {
      console.error('Groq error:', error);
      throw error;
    }
  }

  throw new Error('No AI API keys configured');
}

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GENERATE-AUDIT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const { prompt, projectId, title } = await req.json();
    logStep("Request data received", { projectId, title, prompt: prompt?.slice(0, 100) });

    if (!prompt || !projectId || !title) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

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

    const systemPrompt = `Tu es un expert en audit UX/SEO. Génère un audit détaillé basé sur le prompt fourni.

RÉPONSE REQUISE - Format JSON uniquement:
{
  "title": "Titre de l'audit",
  "description": "Description courte",
  "etapes": [
    {
      "id": "unique-id",
      "type": "ux|seo|performance|accessibility",
      "titre": "Titre de l'étape",
      "description": "Description de l'étape",
      "priority": "high|medium|low",
      "prompt": "Prompt détaillé pour cette étape d'audit",
      "status": "pending",
      "recommendations": "Recommandations optionnelles"
    }
  ]
}

IMPORTANT: Retourne UNIQUEMENT le JSON, sans texte avant ou après.`;

    logStep("Calling AI API with fallback");
    const generatedContent = await callAIWithFallback([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ], 'gpt-4o-mini', 2000, 0.7);
    logStep("AI response received");

    // Parse the JSON response
    let auditData;
    try {
      auditData = JSON.parse(generatedContent);
    } catch (e) {
      logStep("Error parsing AI response", { error: e, content: generatedContent });
      throw new Error("Invalid response format from AI");
    }

    // If projectId is provided, save to database
    if (projectId) {
      const { data: savedAudit, error: saveError } = await supabaseClient
        .from('ux_audits')
        .insert({
          project_id: projectId,
          title: title,
          description: auditData.description,
          etapes: auditData.etapes
        })
        .select()
        .single();

      if (saveError) {
        logStep("Error saving audit", { error: saveError });
        throw new Error("Failed to save audit");
      }

      logStep("Audit saved successfully", { auditId: savedAudit.id });
      
      return new Response(JSON.stringify({ 
        ...auditData,
        id: savedAudit.id,
        success: true 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Return generated audit without saving
    return new Response(JSON.stringify(auditData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in generate-audit", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});