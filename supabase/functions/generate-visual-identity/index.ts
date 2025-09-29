import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://deno.land/x/supabase@1.0.0/mod.ts";

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

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, projectId } = await req.json();
    console.log('Generating visual identity for project:', projectId);

    // Check usage limits before proceeding
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Authentication required");

    const supabaseService = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseService.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Authentication failed");

    // Check usage limit
    const { data: canProceed, error: limitError } = await supabaseService
      .rpc('check_usage_limit', {
        p_user_id: userData.user.id,
        p_action_type: 'visual_identity'
      });

    if (limitError) {
      console.error('Error checking usage limit:', limitError);
      throw new Error('Unable to verify usage limits');
    }

    if (!canProceed) {
      return new Response(JSON.stringify({ 
        error: 'Usage limit exceeded for visual identity generation this month. Please upgrade your plan.' 
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const visualIdentityContent = await callAIWithFallback([
      { 
        role: 'system', 
        content: `Tu es un expert en design et identité visuelle. Génère une identité visuelle complète basée sur la description fournie. Retourne le résultat au format JSON avec cette structure:
        {
          "couleurs": [
            {
              "nom": "Couleur primaire",
              "hex": "#1234AB",
              "usage": "Éléments principaux, boutons"
            }
          ],
          "polices": [
            {
              "nom": "Inter",
              "type": "sans-serif",
              "usage": "Titres et corps de texte"
            }
          ],
          "styles": {
            "theme": "moderne|minimaliste|coloré|professionnel",
            "bordures": "arrondies|carrées|mixtes",
            "ombres": "douces|marquées|aucune",
            "espacement": "compact|normal|aéré"
          }
        }` 
      },
      { role: 'user', content: prompt }
    ], 'gpt-4o-mini', 1500, 0.7);

    let identityData;
    try {
      identityData = JSON.parse(visualIdentityContent);
    } catch (parseError) {
      console.error('Failed to parse identity JSON:', parseError);
      identityData = {
        couleurs: [
          { nom: "Primaire", hex: "#3B82F6", usage: "Éléments principaux" },
          { nom: "Secondaire", hex: "#64748B", usage: "Texte secondaire" }
        ],
        polices: [
          { nom: "Inter", type: "sans-serif", usage: "Général" }
        ],
        styles: {
          theme: "moderne",
          bordures: "arrondies",
          ombres: "douces",
          espacement: "normal"
        }
      };
    }

    if (projectId) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      const { error: dbError } = await supabase
        .from('visual_identities')
        .insert({
          project_id: projectId,
          couleurs: identityData.couleurs,
          polices: identityData.polices,
          styles: identityData.styles
        });

      if (dbError) {
        console.error('Database error:', dbError);
      }

      // Record usage after successful generation
      const { error: usageError } = await supabase
        .rpc('record_usage', {
          p_user_id: userData.user.id,
          p_action_type: 'visual_identity',
          p_project_id: projectId
        });

      if (usageError) {
        console.error('Error recording usage:', usageError);
      }
    }

    return new Response(JSON.stringify(identityData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-visual-identity function:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});