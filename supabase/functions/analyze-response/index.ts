import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { stepPrompt, response, stepTitle } = await req.json();
    console.log('Analyze response request:', { stepTitle, stepPrompt: stepPrompt?.substring(0, 100) + '...' });

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set');
    }

    console.log('Analyzing response with OpenAI...');

    const analysisResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-2025-08-07',
        messages: [
          {
            role: 'system',
            content: `Tu es un expert en analyse de réponses d'outils NoCode (Lovable, Bolt, V0, etc.). 
            Analyse la réponse fournie et détermine si l'étape a été exécutée correctement.
            
            Classe la réponse en:
            - "success": L'étape s'est déroulée sans problème, le code/résultat est correct
            - "error": Il y a une erreur claire (syntaxe, logique, fonctionnalité manquante)
            - "ambiguous": Le résultat est partiellement correct ou nécessite des clarifications
            
            Réponds UNIQUEMENT avec un JSON au format:
            {
              "status": "success|error|ambiguous",
              "message": "Explication de ton analyse",
              "suggestion": "Suggestion d'amélioration si nécessaire (optionnel)"
            }`
          },
          {
            role: 'user',
            content: `Étape: ${stepTitle}
            Prompt original: ${stepPrompt}
            
            Réponse à analyser: ${response}
            
            Analyse cette réponse et détermine si l'étape a été réussie.`
          }
        ],
        max_completion_tokens: 500,
      }),
    });

    if (!analysisResponse.ok) {
      const errorData = await analysisResponse.text();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${analysisResponse.status}`);
    }

    const data = await analysisResponse.json();
    let analysisContent = data.choices[0].message.content;
    console.log('Response analysis completed');

    // Parse JSON from response
    try {
      // Remove markdown code blocks if present
      analysisContent = analysisContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      const analysis = JSON.parse(analysisContent);

      // Validate required fields
      if (!analysis.status || !analysis.message) {
        throw new Error('Invalid analysis format');
      }

      // Ensure status is valid
      if (!['success', 'error', 'ambiguous'].includes(analysis.status)) {
        analysis.status = 'ambiguous';
      }

      return new Response(JSON.stringify({
        success: true,
        analysis
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.log('Raw analysis content:', analysisContent);
      
      // Fallback analysis if JSON parsing fails
      const fallbackAnalysis = {
        status: 'ambiguous',
        message: 'Impossible d\'analyser automatiquement la réponse. Vérification manuelle recommandée.',
        suggestion: 'Examinez manuellement la réponse pour déterminer si l\'étape a été exécutée correctement.'
      };

      return new Response(JSON.stringify({
        success: true,
        analysis: fallbackAnalysis,
        fallback: true
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('Error in analyze-response function:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});