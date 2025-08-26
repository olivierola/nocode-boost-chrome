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
    console.log('Generating plan for project:', projectId);

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
            content: `Tu es un expert en développement qui génère des plans détaillés. Crée un plan de développement structuré avec des étapes claires et réalisables. Retourne le résultat au format JSON avec cette structure:
            {
              "etapes": [
                {
                  "titre": "Titre de l'étape",
                  "description": "Description détaillée",
                  "taches": ["Tâche 1", "Tâche 2"],
                  "duree_estimee": "2-3 jours",
                  "priorite": "haute|moyenne|basse"
                }
              ]
            }` 
          },
          { role: 'user', content: prompt }
        ],
        max_tokens: 2000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const planContent = data.choices[0].message.content;

    let planData;
    try {
      planData = JSON.parse(planContent);
    } catch (parseError) {
      console.error('Failed to parse plan JSON:', parseError);
      planData = {
        etapes: [{
          titre: "Plan généré",
          description: planContent,
          taches: ["Réviser le plan", "Commencer l'implémentation"],
          duree_estimee: "À définir",
          priorite: "moyenne"
        }]
      };
    }

    if (projectId) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      const { error: dbError } = await supabase
        .from('plans')
        .insert({
          project_id: projectId,
          etapes: planData.etapes,
          status: 'draft'
        });

      if (dbError) {
        console.error('Database error:', dbError);
      }
    }

    return new Response(JSON.stringify(planData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-plan function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});