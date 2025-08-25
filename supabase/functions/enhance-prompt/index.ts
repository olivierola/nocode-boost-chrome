import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
    const { prompt, mode = 'enhance', componentTag } = await req.json();
    console.log('Enhance prompt request:', { prompt, mode, componentTag });

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    let enhancedPrompt = prompt;

    // Handle component tag replacement
    if (componentTag && prompt.includes(componentTag)) {
      console.log('Processing component tag:', componentTag);
      
      // Extract component name from tag like {component:login_form}
      const componentName = componentTag.replace(/[{}]/g, '').split(':')[1];
      
      // Fetch component from database
      const { data: component, error } = await supabase
        .from('components')
        .select('*')
        .eq('nom', componentName)
        .single();

      if (error) {
        console.error('Error fetching component:', error);
      } else if (component) {
        console.log('Found component:', component.nom);
        enhancedPrompt = prompt.replace(componentTag, component.prompt || component.description || '');
      }
    }

    // Enhance prompt with OpenAI if requested
    if (mode === 'enhance') {
      console.log('Enhancing prompt with OpenAI...');
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
              content: `Tu es un expert en prompts pour outils NoCode (Lovable, Bolt, V0, etc.). 
              Améliore le prompt suivant pour qu'il soit plus précis, détaillé et efficace. 
              Garde le même objectif mais ajoute des détails techniques, des bonnes pratiques et des spécifications claires.
              Réponds uniquement avec le prompt amélioré, sans introduction ni explication.`
            },
            {
              role: 'user',
              content: enhancedPrompt
            }
          ],
          max_completion_tokens: 1000,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('OpenAI API error:', errorData);
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      enhancedPrompt = data.choices[0].message.content;
      console.log('Prompt enhanced successfully');
    }

    return new Response(JSON.stringify({ 
      enhancedPrompt,
      original: prompt 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in enhance-prompt function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      enhancedPrompt: null 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});