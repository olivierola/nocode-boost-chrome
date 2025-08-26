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
    const { prompt, projectId, title } = await req.json();
    console.log('Generating UX audit for project:', projectId);

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
            content: `Tu es un expert UX qui effectue des audits détaillés d'interfaces utilisateur. Analyse les éléments fournis et génère un audit complet. Retourne le résultat au format JSON avec cette structure:
            {
              "etapes": [
                {
                  "categorie": "Navigation|Design|Accessibilité|Performance|Contenu",
                  "probleme": "Description du problème identifié",
                  "impact": "Impact sur l'utilisateur",
                  "solution": "Solution recommandée",
                  "priorite": "critique|haute|moyenne|basse"
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
    const auditContent = data.choices[0].message.content;

    let auditData;
    try {
      auditData = JSON.parse(auditContent);
    } catch (parseError) {
      console.error('Failed to parse audit JSON:', parseError);
      auditData = {
        etapes: [{
          categorie: "Général",
          probleme: "Audit généré",
          impact: auditContent,
          solution: "Réviser les recommandations",
          priorite: "moyenne"
        }]
      };
    }

    if (projectId) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      const { error: dbError } = await supabase
        .from('ux_audits')
        .insert({
          project_id: projectId,
          title: title || 'Audit UX',
          etapes: auditData.etapes
        });

      if (dbError) {
        console.error('Database error:', dbError);
      }
    }

    return new Response(JSON.stringify(auditData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-audit function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});