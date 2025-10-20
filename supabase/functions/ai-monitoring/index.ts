import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to call AI with fallback including Gemini
async function callAI(planData: any, projectStatus: any, analysisType: string, context: any) {
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  const groqApiKey = Deno.env.get('GROQ_API_KEY');
  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

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

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];

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
          model: 'gpt-4o-mini',
          messages,
          temperature: 0.7,
          max_tokens: 1000,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.choices[0]?.message?.content;
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
          model: 'llama-3.1-70b-versatile',
          messages,
          temperature: 0.7,
          max_tokens: 1000,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.choices[0]?.message?.content;
      } else {
        console.log(`Groq failed with status ${response.status}, trying Gemini...`);
      }
    } catch (error) {
      console.log('Groq error:', error, 'trying Gemini...');
    }
  }

  // Fallback to Gemini Direct API
  const googleApiKey = Deno.env.get('GOOGLE_API_KEY');
  if (googleApiKey) {
    try {
      console.log('Attempting Gemini Direct API call...');
      
      // Convert messages to Gemini format
      const geminiMessages = messages.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      }));
      
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${googleApiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: geminiMessages,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1000,
          }
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text;
      } else {
        throw new Error(`Gemini API error: ${response.status}`);
      }
    } catch (error) {
      console.error('Gemini error:', error);
      throw new Error('All AI providers (OpenAI, Groq, Gemini) failed');
    }
  }

  throw new Error('No AI API keys configured');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { planData, projectStatus, analysisType, context } = await req.json();

    const aiResponse = await callAI(planData, projectStatus, analysisType, context);

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