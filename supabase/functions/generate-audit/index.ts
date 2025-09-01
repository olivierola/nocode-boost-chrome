import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
    const { prompt, projectId, title } = await req.json();
    console.log('Generating UX audit for project:', projectId);

    const auditContent = await callAIWithFallback([
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
    ], 'gpt-4o-mini', 2000, 0.7);

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