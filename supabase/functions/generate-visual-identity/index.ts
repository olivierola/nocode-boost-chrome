import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, projectId } = await req.json();
    console.log('Generating visual identity for project:', projectId);

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
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
        ],
        max_tokens: 1500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const identityContent = data.choices[0].message.content;

    let identityData;
    try {
      identityData = JSON.parse(identityContent);
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
    }

    return new Response(JSON.stringify(identityData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-visual-identity function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});