import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialiser Supabase
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');

// Fonction pour appeler l'IA avec fallback
async function callAIWithFallback(messages: any[], model: string, maxTokens: number = 2000) {
  // Essayer OpenAI d'abord
  if (OPENAI_API_KEY) {
    try {
      const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model.includes('gpt-5') ? model : 'gpt-4o-mini',
          messages: messages,
          max_tokens: maxTokens,
          temperature: 0.7
        }),
      });

      if (openAIResponse.ok) {
        const data = await openAIResponse.json();
        return data.choices[0].message.content;
      }
    } catch (error) {
      console.error('Erreur OpenAI:', error);
    }
  }

  // Fallback vers Groq
  if (GROQ_API_KEY) {
    try {
      const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: messages,
          max_tokens: maxTokens,
          temperature: 0.7
        }),
      });

      if (groqResponse.ok) {
        const data = await groqResponse.json();
        return data.choices[0].message.content;
      }
    } catch (error) {
      console.error('Erreur Groq:', error);
    }
  }

  throw new Error('Aucune API IA disponible');
}

serve(async (req) => {
  // Gérer les requêtes CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      action, 
      plan_id, 
      project_id, 
      user_id, 
      current_step, 
      execution_context, 
      context_history,
      action_type,
      action_data
    } = await req.json();

    console.log('Plan Agent - Action:', action);

    if (action === 'monitor_progress') {
      // Récupérer le plan
      const { data: plan, error: planError } = await supabase
        .from('plans')
        .select('*')
        .eq('id', plan_id)
        .single();

      if (planError) throw planError;

      // Analyser l'avancement et suggérer des actions
      const analysisPrompt = `
Tu es un agent IA expert en développement SaaS qui surveille l'avancement d'un plan d'implémentation.

PLAN ACTUEL:
${JSON.stringify(plan.plan_data, null, 2)}

ÉTAPE COURANTE:
${JSON.stringify(current_step, null, 2)}

CONTEXTE D'EXÉCUTION:
${JSON.stringify(execution_context, null, 2)}

HISTORIQUE DU CONTEXTE:
${JSON.stringify(context_history, null, 2)}

Analyse la situation et suggère des actions concrètes pour optimiser l'avancement du plan.

Types d'actions possibles:
1. "optimize_prompt" - Optimiser un prompt avant envoi
2. "generate_step" - Générer une étape intermédiaire 
3. "analyze_response" - Analyser une réponse d'outil
4. "suggest_improvement" - Suggérer une amélioration
5. "inject_knowledge" - Injecter des connaissances (composants, couleurs, polices)

Réponds en JSON avec cette structure:
{
  "suggested_actions": [
    {
      "type": "optimize_prompt",
      "title": "Titre de l'action",
      "description": "Description détaillée",
      "prompt": "Prompt optimisé si applicable",
      "context": {
        "priority": "high|medium|low",
        "estimated_impact": "Description de l'impact"
      }
    }
  ],
  "analysis": {
    "current_status": "Description du statut actuel",
    "next_recommended_steps": "Prochaines étapes recommandées",
    "potential_issues": "Problèmes potentiels identifiés"
  }
}`;

      const response = await callAIWithFallback([
        { role: 'system', content: 'Tu es un agent IA expert en développement SaaS.' },
        { role: 'user', content: analysisPrompt }
      ], 'gpt-4o-mini', 3000);

      try {
        const analysisResult = JSON.parse(response);
        return new Response(JSON.stringify(analysisResult), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (parseError) {
        // Fallback si le JSON n'est pas valide
        return new Response(JSON.stringify({
          suggested_actions: [{
            type: 'suggest_improvement',
            title: 'Analyse générale',
            description: response.substring(0, 200) + '...',
            context: { priority: 'medium', estimated_impact: 'Amélioration générale' }
          }],
          analysis: {
            current_status: 'Analyse en cours',
            next_recommended_steps: response,
            potential_issues: 'Aucun problème identifié'
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

    } else if (action === 'execute_action') {
      // Exécuter une action spécifique
      let result = {};

      switch (action_type) {
        case 'optimize_prompt':
          // Charger la base de connaissances
          const { data: components } = await supabase
            .from('components')
            .select('*')
            .eq('user_id', user_id);

          const knowledgeBase = {
            components: components || [],
            colors: [
              { name: 'Bleu Moderne', colors: ['#2563eb', '#3b82f6', '#60a5fa'], use_case: 'professionnel' },
              { name: 'Vert Nature', colors: ['#16a34a', '#22c55e', '#4ade80'], use_case: 'eco-responsable' }
            ],
            fonts: [
              { name: 'Inter', category: 'sans-serif', use_cases: ['interfaces', 'lisibilité'] },
              { name: 'Playfair Display', category: 'serif', use_cases: ['titres', 'élégance'] }
            ]
          };

          const optimizationPrompt = `
Tu es un expert en optimisation de prompts pour outils no-code.

PROMPT ORIGINAL:
${action_data.prompt || action_data.description}

BASE DE CONNAISSANCES DISPONIBLE:
${JSON.stringify(knowledgeBase, null, 2)}

CONTEXTE DU PROJET:
${JSON.stringify(execution_context, null, 2)}

Optimise ce prompt en:
1. Ajoutant des détails spécifiques si nécessaire
2. Injectant des ressources de la base de connaissances pertinentes
3. Améliorant la clarté des instructions
4. Ajoutant des exemples concrets

Réponds en JSON:
{
  "optimized_prompt": "Prompt optimisé avec ressources injectées",
  "injected_resources": {
    "components": ["noms des composants utilisés"],
    "colors": ["palettes recommandées"],
    "fonts": ["polices recommandées"]
  },
  "optimization_notes": "Notes sur les améliorations apportées"
}`;

          const optimizationResult = await callAIWithFallback([
            { role: 'system', content: 'Tu es un expert en optimisation de prompts.' },
            { role: 'user', content: optimizationPrompt }
          ], 'gpt-4o-mini', 2000);

          try {
            result = JSON.parse(optimizationResult);
          } catch {
            result = {
              optimized_prompt: optimizationResult,
              injected_resources: {},
              optimization_notes: 'Optimisation appliquée'
            };
          }
          break;

        case 'generate_step':
          const stepGenerationPrompt = `
Génère une étape intermédiaire détaillée pour le plan de développement.

CONTEXTE:
${JSON.stringify(action_data.context, null, 2)}

ÉTAPE COURANTE:
${JSON.stringify(current_step, null, 2)}

Génère une étape avec:
- Titre clair
- Description détaillée
- Prompt optimisé pour l'exécution
- Type d'étape (documentation, implementation, backend, security)

Réponds en JSON:
{
  "generated_step": {
    "title": "Titre de l'étape",
    "description": "Description détaillée",
    "prompt": "Prompt optimisé pour cette étape",
    "type": "implementation",
    "estimated_duration": "durée estimée",
    "dependencies": ["étapes prérequises"],
    "success_criteria": "Critères de réussite"
  }
}`;

          const stepResult = await callAIWithFallback([
            { role: 'system', content: 'Tu es un expert en planification de développement SaaS.' },
            { role: 'user', content: stepGenerationPrompt }
          ], 'gpt-4o-mini', 2000);

          try {
            result = JSON.parse(stepResult);
          } catch {
            result = {
              generated_step: {
                title: 'Étape générée',
                description: stepResult,
                type: 'implementation'
              }
            };
          }
          break;

        case 'analyze_response':
          const analysisPrompt = `
Analyse cette réponse d'outil no-code pour déterminer ce qui a été implémenté.

RÉPONSE À ANALYSER:
${JSON.stringify(action_data.response, null, 2)}

CONTEXTE:
${JSON.stringify(execution_context, null, 2)}

Analyse et détermine:
1. Ce qui a été effectivement implémenté
2. Ce qui reste à faire
3. Problèmes potentiels
4. Prochaines étapes recommandées

Réponds en JSON:
{
  "analysis": {
    "implemented_features": ["liste des fonctionnalités implémentées"],
    "remaining_tasks": ["tâches restantes"],
    "issues_detected": ["problèmes identifiés"],
    "next_steps": ["prochaines étapes recommandées"],
    "completion_percentage": 75
  }
}`;

          const responseAnalysis = await callAIWithFallback([
            { role: 'system', content: 'Tu es un expert en analyse de développement.' },
            { role: 'user', content: analysisPrompt }
          ], 'gpt-4o-mini', 2000);

          try {
            result = JSON.parse(responseAnalysis);
          } catch {
            result = {
              analysis: {
                implemented_features: ['Analyse en cours'],
                remaining_tasks: ['À déterminer'],
                next_steps: [responseAnalysis],
                completion_percentage: 50
              }
            };
          }
          break;

        default:
          result = { message: 'Action non reconnue' };
      }

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Action non supportée' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Erreur Plan Agent:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});