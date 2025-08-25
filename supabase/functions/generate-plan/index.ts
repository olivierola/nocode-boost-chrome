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
    const { projectIdea, projectName } = await req.json();
    console.log('Generate plan request:', { projectIdea, projectName });

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set');
    }

    console.log('Generating plan with OpenAI...');

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
            content: `Tu es un expert en gestion de projet et développement NoCode. 
            Génère un plan de projet structuré sous forme JSON avec des étapes et sous-étapes.
            Chaque étape doit avoir: id, titre, description, prompt (instruction détaillée), status: "pending".
            Chaque sous-étape doit avoir les mêmes propriétés.
            Concentre-toi sur des étapes actionnables et des prompts précis pour des outils NoCode.
            
            Format de réponse attendu:
            {
              "etapes": [
                {
                  "id": "uuid",
                  "titre": "Nom de l'étape",
                  "description": "Description détaillée",
                  "prompt": "Prompt précis et actionnable pour outil NoCode",
                  "status": "pending",
                  "sousEtapes": [
                    {
                      "id": "uuid", 
                      "titre": "Sous-étape",
                      "description": "Description",
                      "prompt": "Prompt spécifique",
                      "status": "pending"
                    }
                  ]
                }
              ]
            }`
          },
          {
            role: 'user',
            content: `Projet: ${projectName}\nIdée: ${projectIdea}\n\nGénère un plan de développement structuré avec des étapes concrètes et actionnables.`
          }
        ],
        max_completion_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    let generatedContent = data.choices[0].message.content;
    console.log('Plan generated successfully');

    // Parse JSON from response
    try {
      // Remove markdown code blocks if present
      generatedContent = generatedContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      const planData = JSON.parse(generatedContent);
      
      // Generate UUIDs for steps if not present
      if (planData.etapes) {
        planData.etapes.forEach((etape: any) => {
          if (!etape.id) etape.id = crypto.randomUUID();
          if (etape.sousEtapes) {
            etape.sousEtapes.forEach((sousEtape: any) => {
              if (!sousEtape.id) sousEtape.id = crypto.randomUUID();
            });
          }
        });
      }

      return new Response(JSON.stringify({
        success: true,
        plan: planData
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.log('Raw content:', generatedContent);
      
      // Fallback plan if JSON parsing fails
      const fallbackPlan = {
        etapes: [
          {
            id: crypto.randomUUID(),
            titre: "Analyse et conception",
            description: "Analyser les besoins et concevoir l'architecture",
            prompt: `Analyser les besoins pour : ${projectIdea}. Créer une architecture claire avec les fonctionnalités principales.`,
            status: "pending",
            sousEtapes: [
              {
                id: crypto.randomUUID(),
                titre: "Définition des besoins",
                description: "Identifier et documenter les besoins fonctionnels",
                prompt: "Lister les fonctionnalités essentielles et définir le MVP",
                status: "pending"
              }
            ]
          },
          {
            id: crypto.randomUUID(),
            titre: "Développement",
            description: "Créer l'application selon les spécifications",
            prompt: `Développer l'application ${projectName} avec les fonctionnalités définies`,
            status: "pending",
            sousEtapes: []
          },
          {
            id: crypto.randomUUID(),
            titre: "Tests et déploiement",
            description: "Tester et déployer l'application",
            prompt: "Effectuer les tests finaux et déployer en production",
            status: "pending",
            sousEtapes: []
          }
        ]
      };

      return new Response(JSON.stringify({
        success: true,
        plan: fallbackPlan,
        fallback: true
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('Error in generate-plan function:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});