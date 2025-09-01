import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
          max_tokens: maxTokens,
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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, response, context, stepIndex } = await req.json();

    if (context === 'plan_execution') {
      // Traitement d'un prompt d'exécution d'étape
      console.log(`Executing step ${stepIndex}: ${prompt}`);

      const aiContent = await callAIWithFallback([
        {
          role: 'system',
          content: `Tu es un assistant IA qui aide à exécuter des étapes de développement. 
          Tu dois analyser le prompt d'étape et fournir une réponse détaillée sur l'exécution.
          
          Réponds avec un objet JSON contenant :
          - success: boolean (true si l'étape peut être exécutée avec succès)
          - response: string (description détaillée de ce qui a été fait ou du problème)
          - needsUserAction: boolean (true si une action utilisateur est requise)
          - userActionType: string optionnel ('api_key', 'confirmation', 'input')
          - userActionPrompt: string optionnel (message pour l'utilisateur)
          
          Exemples de cas nécessitant une action utilisateur :
          - Configuration d'API keys
          - Confirmations de sécurité
          - Saisie de paramètres spécifiques`
        },
        {
          role: 'user',
          content: `Étape à exécuter: ${prompt}`
        }
      ], 'gpt-4o-mini', 1000, 0.3);

      let result;
      
      try {
        result = JSON.parse(aiContent);
      } catch (parseError) {
        // Si la réponse n'est pas du JSON valide, créer une réponse par défaut
        result = {
          success: true,
          response: aiContent,
          needsUserAction: false
        };
      }

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (context === 'response_analysis') {
      // Analyse d'une réponse d'outil IA
      console.log(`Analyzing response: ${response}`);

      const aiContent = await callAIWithFallback([
        {
          role: 'system',
          content: `Tu es un analyseur de réponses d'outils IA. 
          Ton rôle est d'analyser une réponse et déterminer la suite des actions.
          
          Réponds avec un objet JSON contenant :
          - shouldContinue: boolean (true si on peut passer à l'étape suivante)
          - needsCorrection: boolean (true si une correction est nécessaire)
          - correctionPrompt: string optionnel (nouveau prompt pour corriger)
          - suggestion: string (suggestion pour la suite)
          
          Critères d'analyse :
          - Rechercher des mots-clés d'erreur ou de succès
          - Évaluer si l'objectif de l'étape est atteint
          - Détecter les besoins de correction ou d'amélioration`
        },
        {
          role: 'user',
          content: `Analyse cette réponse: ${response}`
        }
      ], 'gpt-4o-mini', 500, 0.2);

      let result;
      
      try {
        result = JSON.parse(aiContent);
      } catch (parseError) {
        // Fallback analysis
        const responseText = response.toLowerCase();
        const hasError = ['erreur', 'error', 'échec', 'failed'].some(keyword => 
          responseText.includes(keyword)
        );
        const hasSuccess = ['succès', 'success', 'complété', 'terminé'].some(keyword => 
          responseText.includes(keyword)
        );

        result = {
          shouldContinue: hasSuccess && !hasError,
          needsCorrection: hasError,
          suggestion: hasSuccess ? "Étape réussie" : hasError ? "Erreur détectée" : "Réponse ambiguë"
        };
      }

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error('Context non supporté');

  } catch (error) {
    console.error('Error in analyze-response function:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to analyze response', 
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});