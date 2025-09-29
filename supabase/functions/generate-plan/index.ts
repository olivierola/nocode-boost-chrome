import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to call AI with fallback
async function callAIWithFallback(messages: any[], model: string, maxTokens?: number, temperature?: number) {
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  const groqApiKey = Deno.env.get('GROQ_API_KEY');

  // Try OpenAI first
  if (openAIApiKey) {
    try {
      console.log('Attempting OpenAI API call...');
      const body: any = {
        model,
        messages,
      };

      // Add temperature only for compatible models
      if (!model.includes('gpt-5') && !model.includes('o3') && !model.includes('o4') && !model.includes('gpt-4.1')) {
        body.temperature = temperature || 0.7;
      }

      // Use max_completion_tokens for newer models
      if (model.includes('gpt-5') || model.includes('o3') || model.includes('o4') || model.includes('gpt-4.1')) {
        if (maxTokens) body.max_completion_tokens = maxTokens;
      } else {
        if (maxTokens) body.max_tokens = maxTokens;
      }

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const data = await response.json();
        return data.choices[0].message.content;
      } else {
        const errorText = await response.text();
        console.log(`OpenAI failed with status ${response.status}: ${errorText}, trying Groq...`);
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
          model: 'llama-3.1-70b-versatile',
          messages,
          temperature: temperature || 0.7,
          max_tokens: maxTokens || 4000,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.choices[0].message.content;
      } else {
        const errorText = await response.text();
        console.log(`Groq failed with status ${response.status}: ${errorText}`);
        throw new Error(`Groq API failed: ${errorText}`);
      }
    } catch (error) {
      console.log('Groq error:', error);
      throw error;
    }
  }

  throw new Error('No AI API keys available');
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get user from request
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.log('Auth error:', authError);
      return new Response(JSON.stringify({ error: 'Non autorisé' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { prompt: userPrompt, projectId, conversationHistory = [] } = await req.json();

    if (!userPrompt || !projectId) {
      return new Response(JSON.stringify({ error: 'Prompt et projectId requis' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get project info to include in plan generation
    const { data: project } = await supabaseClient
      .from('projects')
      .select('project_type, tech_stack, framework_details')
      .eq('id', projectId)
      .single();

    console.log('Generating plan for user:', user.id, 'project:', projectId, 'with context:', project);

    // Check usage limits
    const { data: canUse, error: usageError } = await supabaseClient
      .rpc('check_usage_limit', {
        p_user_id: user.id,
        p_action_type: 'plan_generation'
      });

    if (usageError || !canUse) {
      console.log('Usage limit exceeded or error:', usageError);
      return new Response(JSON.stringify({ 
        error: 'Limite d\'utilisation atteinte',
        type: 'usage_limit_exceeded'
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Step 1: Check if clarification is needed
    const clarificationMessages = [
      {
        role: "system",
        content: `Tu es un assistant IA spécialisé dans l'analyse de projets SaaS. 
        Analyse si la demande suivante est suffisamment claire pour générer un plan d'implémentation détaillé.
        
        Réponds UNIQUEMENT au format JSON :
        {
          "isClear": true/false,
          "questions": ["question1", "question2"] // seulement si isClear = false
        }
        
        Une demande est claire si elle contient :
        - Le type d'application/SaaS souhaité
        - Les utilisateurs cibles (au moins une indication)
        - Le problème à résoudre ou l'objectif principal
        
        Si ces éléments manquent, pose 2-3 questions précises pour les clarifier.`
      },
      {
        role: "user",
        content: userPrompt
      }
    ];

    const clarityResponse = await callAIWithFallback(clarificationMessages, 'gpt-4o-mini', 500);
    let clarityResult;
    
    try {
      clarityResult = JSON.parse(clarityResponse);
    } catch (e) {
      console.log('Failed to parse clarity response:', clarityResponse);
      clarityResult = { isClear: true };
    }

    if (!clarityResult.isClear) {
      return new Response(JSON.stringify({
        type: 'clarification_needed',
        questions: clarityResult.questions,
        message: "Votre demande necessite quelques precisions. Pouvez-vous repondre a ces questions ?"
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Step 2: Generate comprehensive plan using new structure
        const planMessages = [
          {
            role: "system",
            content: `Tu es un expert en SaaS, stratégie produit, no-code development, et gestion de projet.  
Je veux que tu réalises une étude très complète pour un projet SaaS, puis que tu crées un plan d'implémentation détaillé avec un outil no-code.  

### Contexte du Projet
- Type d'application: ${project?.project_type || 'web'}
- Stack technique: ${project?.tech_stack || 'react'}
- Framework details: ${JSON.stringify(project?.framework_details || {})}

### Instructions de génération
- Prendre en compte le type d'application et la stack technique choisie
- Adapter les recommandations techniques selon la plateforme cible
- Inclure des considérations spécifiques au type de projet (mobile, desktop, etc.)
- Optimiser pour la stack technique sélectionnée

### Contexte
- Objectif : construire un SaaS rentable, innovant et simple à développer en no-code.  
- Format attendu : **JSON strictement valide**.  
- Les parties textuelles (analyse, documentation, explications) doivent être écrites en **Markdown** dans le JSON pour plus de lisibilité.  

### Contenu attendu du JSON
1. **etude_saas** : étude complète du projet SaaS selon plusieurs aspects  
   - Opportunité du marché  
   - Analyse de la concurrence  
   - Personas cibles  
   - Proposition de valeur  
   - Modèle économique (pricing, croissance, rétention)  
   - Tech stack recommandée (no-code + API possibles)  
   - Risques & challenges + atténuations  

2. **plan_implementation** : plan d'implémentation détaillé en plusieurs étapes  
   Chaque étape doit contenir :  
   - \`titre\` : nom court et clair  
   - \`description\` : explication détaillée sous format Markdown  
   - \`prompt_optimise\` : prompt prêt-à-l'emploi pour qu'une IA puisse aider à réaliser cette étape  

### Format de sortie attendu
Le JSON doit avoir la structure suivante :  

{
"etude_saas": {
"documentation_markdown": "## Étude SaaS ... (contenu en markdown)"
},
"plan_implementation": [
{
"titre": "Nom de l'étape",
"description": "### Description\\nTexte en markdown expliquant cette étape...",
"prompt_optimise": "Prompt très détaillé et opérationnel"
},
{
"titre": "Nom de l'étape suivante",
"description": "### Description\\nTexte en markdown explicatif...",
"prompt_optimise": "Prompt suivant"
}
]
}

Ton rôle est d'agir comme un consultant SaaS senior spécialisé dans le growth, le product management et la mise en place d'outils no-code. Tu dois remplir ce JSON avec du contenu riche, concret et actionnable. N'ajoute aucun texte hors du JSON.`
          },
      ...conversationHistory.map((msg: any) => ({
        role: msg.role,
        content: msg.content
      })),
      {
        role: "user",
        content: userPrompt
      }
    ];

    console.log('Calling AI for plan generation...');
    const planResponse = await callAIWithFallback(planMessages, 'gpt-5-2025-08-07', 8000);

    // Clean and parse the response
    let cleanedResponse = planResponse.trim();
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    let planData;
    try {
      planData = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.log('Failed to parse plan response:', cleanedResponse);
      throw new Error('Erreur lors de l\'analyse de la réponse IA');
    }

    // Save or update plan in database
    const { data: existingPlan } = await supabaseClient
      .from('plans')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(1);

    let savedPlan;
    if (existingPlan && existingPlan.length > 0) {
      const { data: updatedPlan, error: updateError } = await supabaseClient
        .from('plans')
        .update({ 
          plan_data: planData,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingPlan[0].id)
        .select()
        .single();

      if (updateError) throw updateError;
      savedPlan = updatedPlan;
    } else {
      const { data: newPlan, error: insertError } = await supabaseClient
        .from('plans')
        .insert({
          project_id: projectId,
          plan_data: planData
        })
        .select()
        .single();

      if (insertError) throw insertError;
      savedPlan = newPlan;
    }

    // Record usage
    await supabaseClient.rpc('record_usage', {
      p_user_id: user.id,
      p_action_type: 'plan_generation',
      p_project_id: projectId
    });

    // Save assistant message to chat history
    await supabaseClient.rpc('save_plan_chat_message', {
      p_project_id: projectId,
      p_user_id: user.id,
      p_role: 'assistant',
      p_content: 'Plan d\'implémentation généré avec succès',
      p_plan_id: savedPlan.id,
      p_message_type: 'plan_generated'
    });

    console.log('Plan generated and saved successfully');

    return new Response(JSON.stringify({
      plan: savedPlan,
      planData: planData,
      message: 'Plan généré avec succès'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-plan function:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Erreur lors de la génération du plan' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});