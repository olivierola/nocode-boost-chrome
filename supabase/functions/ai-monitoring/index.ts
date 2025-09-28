import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { planData, projectStatus, analysisType, context } = await req.json();

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Construire le prompt d'analyse en fonction du contexte
    let systemPrompt = '';
    let userPrompt = '';

    switch (analysisType) {
      case 'progress_monitoring':
        systemPrompt = `Tu es un assistant IA spécialisé dans le monitoring de projets en temps réel. 
        Ton rôle est d'analyser l'état d'avancement d'un projet et de suggérer des actions concrètes pour optimiser le processus.
        
        Réponds TOUJOURS au format JSON avec cette structure:
        {
          "suggestion": "description de la suggestion",
          "prompt": "prompt spécifique à exécuter",
          "type": "action|warning|optimization|next_step",
          "priority": "low|medium|high",
          "metadata": {}
        }`;

        userPrompt = `Analyse l'état du projet et suggère une action:

Plan du projet: ${JSON.stringify(planData, null, 2)}

État actuel:
- Étape courante: ${projectStatus.currentStep}/${projectStatus.totalSteps}
- Étapes complétées: ${projectStatus.completedSteps}
- État: ${projectStatus.projectState}
- Dernière activité: ${projectStatus.lastActivity}
- Erreurs: ${projectStatus.errors.join(', ')}

Fournis une suggestion d'amélioration avec un prompt précis à exécuter.`;
        break;

      case 'error_analysis':
        systemPrompt = `Tu es un expert en résolution de problèmes pour des projets d'automatisation.
        Analyse les erreurs et propose des solutions.`;
        
        userPrompt = `Erreurs détectées: ${projectStatus.errors.join('. ')}
        Contexte: ${JSON.stringify(projectStatus)}
        
        Propose une solution avec un prompt de correction.`;
        break;

      case 'optimization':
        systemPrompt = `Tu es un consultant en optimisation de processus.
        Identifie les améliorations possibles dans l'exécution du projet.`;
        
        userPrompt = `Analyse l'efficacité du projet et suggère des optimisations:
        ${JSON.stringify({ planData, projectStatus })}`;
        break;

      default:
        systemPrompt = `Tu es un assistant IA de monitoring généraliste.`;
        userPrompt = `Analyse: ${JSON.stringify({ planData, projectStatus, context })}`;
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content;

    if (!aiResponse) {
      throw new Error('Empty response from AI');
    }

    // Tenter de parser le JSON, avec fallback
    let result;
    try {
      result = JSON.parse(aiResponse);
    } catch (parseError) {
      // Fallback si la réponse n'est pas en JSON
      result = {
        suggestion: aiResponse.substring(0, 200),
        prompt: `Basé sur l'analyse: ${aiResponse.substring(0, 100)}...`,
        type: 'action',
        priority: 'medium',
        metadata: { rawResponse: aiResponse }
      };
    }

    // Validation et enrichissement de la réponse
    const enrichedResult = {
      suggestion: result.suggestion || 'Aucune suggestion spécifique',
      prompt: result.prompt || '',
      type: result.type || 'action',
      priority: result.priority || 'medium',
      metadata: {
        ...result.metadata,
        timestamp: new Date().toISOString(),
        analysisType,
        projectStage: `${projectStatus.completedSteps}/${projectStatus.totalSteps}`
      }
    };

    return new Response(JSON.stringify(enrichedResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-monitoring function:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      suggestion: 'Erreur de monitoring IA',
      type: 'error',
      priority: 'low'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});