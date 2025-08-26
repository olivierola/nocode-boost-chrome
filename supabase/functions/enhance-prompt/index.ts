import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

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
    const { prompt, mode = 'enhance' } = await req.json();
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

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

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
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
        ],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const enhancedPrompt = data.choices[0].message.content;

    return new Response(JSON.stringify({ enhancedPrompt }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in enhance-prompt function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});