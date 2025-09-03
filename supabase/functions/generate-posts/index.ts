import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper function to call AI with fallback
async function callAIWithFallback(messages: any[], model: string, temperature: number) {
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
          temperature,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.choices[0].message.content;
      } else {
        console.log(`OpenAI failed with status ${response.status}, trying Groq...`);
      }
    } catch (error) {
      console.log('OpenAI error:', error, 'trying Groq...');
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
          max_tokens: 2000,
          temperature,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.choices[0].message.content;
      } else {
        throw new Error(`Groq API error: ${response.status}`);
      }
    } catch (error) {
      console.error('Groq error:', error);
      throw new Error('Both OpenAI and Groq APIs failed');
    }
  }

  throw new Error('No AI API keys configured');
}

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GENERATE-POSTS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const { project_id, tone, subject, post_type, count = 10 } = await req.json();
    logStep("Request data received", { project_id, tone, subject, post_type, count });

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

    // Check usage limit
    const { data: canProceed, error: limitError } = await supabaseClient.rpc('check_usage_limit', {
      p_user_id: user.id,
      p_action_type: 'post_generation'
    });

    if (limitError) {
      logStep("Error checking usage limit", { error: limitError });
      throw new Error("Error checking usage limit");
    }

    if (!canProceed) {
      logStep("Usage limit exceeded");
      return new Response(JSON.stringify({ 
        error: "Usage limit exceeded for post generation" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    // Get project details
    const { data: project, error: projectError } = await supabaseClient
      .from('projects')
      .select('name, description, url')
      .eq('id', project_id)
      .single();

    if (projectError) {
      logStep("Error fetching project", { error: projectError });
      throw new Error("Project not found");
    }

    logStep("Project fetched", { project });

    // Get recent plans and activities for context
    const { data: plans } = await supabaseClient
      .from('plans')
      .select('title, description, etapes')
      .eq('project_id', project_id)
      .order('created_at', { ascending: false })
      .limit(3);

    // Prepare context for AI
    const projectContext = {
      name: project.name,
      description: project.description,
      url: project.url,
      recentPlans: plans || []
    };

    const systemPrompt = `Tu es un expert en marketing digital et création de contenu pour les réseaux sociaux. Tu génères des tweets engageants pour promouvoir des projets tech/startup.

CONTEXTE DU PROJET:
- Nom: ${projectContext.name}
- Description: ${projectContext.description}
- URL: ${projectContext.url}
- Plans récents: ${JSON.stringify(projectContext.recentPlans)}

CONSIGNES:
- Tonalité: ${tone}
- Sujet principal: ${subject}  
- Type de post: ${post_type}
- Génère exactement ${count} tweets
- Maximum 280 caractères par tweet
- Utilise des hashtags pertinents
- Inclut des call-to-action engageants
- Varie les formats (questions, faits, citations, etc.)
- Adapte le contenu au type demandé (informatif, engageant, promotionnel, etc.)

RÉPONSE ATTENDUE:
Réponds uniquement avec un tableau JSON de tweets, sans texte supplémentaire:
[
  {
    "content": "Contenu du tweet...",
    "hashtags": ["#hashtag1", "#hashtag2"],
    "cta": "Call to action"
  }
]`;

    logStep("Calling AI API with fallback");
    const generatedContent = await callAIWithFallback([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Génère ${count} tweets ${post_type} sur ${subject} avec une tonalité ${tone}` }
    ], 'gpt-4o-mini', 0.7);
    logStep("AI response received", { content: generatedContent });

    // Parse the JSON response
    let posts;
    try {
      posts = JSON.parse(generatedContent);
    } catch (e) {
      logStep("Error parsing AI response", { error: e, content: generatedContent });
      throw new Error("Invalid response format from AI");
    }

    // Save posts to database
    const postsToInsert = posts.map((post: any) => ({
      user_id: user.id,
      project_id: project_id,
      content: post.content,
      tone: tone,
      subject: subject,
      post_type: post_type,
      metadata: {
        hashtags: post.hashtags || [],
        cta: post.cta || '',
        generated_at: new Date().toISOString()
      }
    }));

    const { data: savedPosts, error: saveError } = await supabaseClient
      .from('posts')
      .insert(postsToInsert)
      .select();

    if (saveError) {
      logStep("Error saving posts", { error: saveError });
      throw new Error("Failed to save posts");
    }

    // Record usage
    await supabaseClient.rpc('record_usage', {
      p_user_id: user.id,
      p_action_type: 'post_generation',
      p_project_id: project_id
    });

    logStep("Posts generated and saved successfully", { 
      count: savedPosts.length,
      posts: savedPosts
    });

    return new Response(JSON.stringify({ 
      posts: savedPosts,
      success: true 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in generate-posts", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});