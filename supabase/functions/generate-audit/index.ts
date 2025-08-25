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
    const { projectName, auditType, description } = await req.json();
    console.log('Generate audit request:', { projectName, auditType, description });

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set');
    }

    const getAuditPrompt = (type: string) => {
      switch (type) {
        case 'ux':
          return `Tu es un expert UX/UI designer. Génère un audit UX complet avec des étapes d'amélioration spécifiques.
          Concentre-toi sur l'expérience utilisateur, l'accessibilité, l'ergonomie et les conversions.`;
        case 'seo':
          return `Tu es un expert SEO technique. Génère un audit SEO complet avec des actions concrètes.
          Couvre le SEO technique, le contenu, les performances, les liens et l'optimisation mobile.`;
        case 'complet':
          return `Tu es un expert en audit digital. Génère un audit complet combinant UX, SEO et performances.
          Fournis des recommandations actionnables pour améliorer tous les aspects du projet.`;
        default:
          return `Génère un audit général du projet avec des recommandations d'amélioration.`;
      }
    };

    console.log('Generating audit with OpenAI...');

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
            content: `${getAuditPrompt(auditType)}
            
            Génère un audit structuré sous forme JSON avec des étapes d'amélioration.
            Chaque étape doit avoir: id, titre, description, prompt (action concrète), status: "pending", priorite: "haute"|"moyenne"|"basse".
            
            Format de réponse attendu:
            {
              "etapes": [
                {
                  "id": "uuid",
                  "titre": "Titre de l'amélioration",
                  "description": "Description détaillée du problème et de la solution",
                  "prompt": "Action concrète à effectuer pour corriger le problème",
                  "status": "pending",
                  "priorite": "haute|moyenne|basse",
                  "categorie": "UX|SEO|Performance|Accessibilité|etc"
                }
              ]
            }`
          },
          {
            role: 'user',
            content: `Projet: ${projectName}
            Type d'audit: ${auditType}
            Description: ${description}
            
            Génère un audit détaillé avec des recommandations concrètes et actionnables.`
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
    console.log('Audit generated successfully');

    // Parse JSON from response
    try {
      // Remove markdown code blocks if present
      generatedContent = generatedContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      const auditData = JSON.parse(generatedContent);
      
      // Generate UUIDs for steps if not present
      if (auditData.etapes) {
        auditData.etapes.forEach((etape: any) => {
          if (!etape.id) etape.id = crypto.randomUUID();
          if (!etape.priorite) etape.priorite = 'moyenne';
          if (!etape.categorie) etape.categorie = auditType.toUpperCase();
        });
      }

      return new Response(JSON.stringify({
        success: true,
        audit: auditData
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.log('Raw content:', generatedContent);
      
      // Fallback audit if JSON parsing fails
      const fallbackAudit = {
        etapes: [
          {
            id: crypto.randomUUID(),
            titre: "Optimisation des performances",
            description: "Améliorer la vitesse de chargement et l'expérience utilisateur",
            prompt: "Analyser et optimiser les performances du site web",
            status: "pending",
            priorite: "haute",
            categorie: auditType.toUpperCase()
          },
          {
            id: crypto.randomUUID(),
            titre: "Amélioration de l'accessibilité",
            description: "Rendre le site accessible à tous les utilisateurs",
            prompt: "Implémenter les standards d'accessibilité WCAG 2.1",
            status: "pending",
            priorite: "moyenne",
            categorie: auditType.toUpperCase()
          },
          {
            id: crypto.randomUUID(),
            titre: "Optimisation mobile",
            description: "Améliorer l'expérience sur les appareils mobiles",
            prompt: "Optimiser le design responsive et les interactions tactiles",
            status: "pending",
            priorite: "haute",
            categorie: auditType.toUpperCase()
          }
        ]
      };

      return new Response(JSON.stringify({
        success: true,
        audit: fallbackAudit,
        fallback: true
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('Error in generate-audit function:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});