import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to call AI with fallback
async function callAIWithFallback(messages: any[], model: string, maxTokens: number, temperature: number) {
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  const groqApiKey = Deno.env.get('GROQ_API_KEY');
  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

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
        console.log(`Groq failed with status ${response.status}, trying Gemini...`);
      }
    } catch (error) {
      console.log('Groq error:', error, 'trying Gemini...');
    }
  }

  // Fallback to Gemini via Lovable AI
  if (lovableApiKey) {
    try {
      console.log('Attempting Gemini API call via Lovable AI...');
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages,
          max_tokens: maxTokens,
          temperature,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.choices[0].message.content;
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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, mode = 'enhance' } = await req.json();

    if (mode === 'replace') {
      // Mode remplacement des tags de composants
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      let transformedPrompt = prompt;
      
      // Extraire les tags de composants
      const componentRegex = /\{component:([^}]+)\}/g;
      const matches = [...prompt.matchAll(componentRegex)];
      
      for (const match of matches) {
        const componentName = match[1];
        
        // Récupérer le composant depuis la base
        const { data: component } = await supabase
          .from('components')
          .select('prompt')
          .eq('nom', componentName)
          .single();
        
        if (component && component.prompt) {
          transformedPrompt = transformedPrompt.replace(match[0], component.prompt);
        }
      }
      
      return new Response(JSON.stringify({ enhancedPrompt: transformedPrompt }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const enhancedPrompt = await callAIWithFallback([
      {
        role: 'system',
        content: `Tu es un expert en création de prompts pour des outils d'intelligence artificielle. 
        Ton rôle est d'améliorer et d'optimiser les prompts pour qu'ils soient plus clairs, précis et efficaces.
        
        Règles d'amélioration :
        - Rendre le prompt plus spécifique et détaillé
        - Ajouter du contexte pertinent
        - Structurer le prompt de manière logique
        - Préciser les attentes de résultat
        - Ajouter des exemples si nécessaire
        - Conserver l'intention originale
        - Utiliser un langage clair et professionnel
        
        Réponds uniquement avec le prompt amélioré, sans préambule ni explication.`
      },
      {
        role: 'user',
        content: `Améliore ce prompt : "${prompt}"`
      }
    ], 'gpt-4o-mini', 1000, 0.7);

    return new Response(JSON.stringify({ enhancedPrompt }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in enhance-prompt function:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});