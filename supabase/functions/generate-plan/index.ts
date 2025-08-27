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
        p_action_type: 'plan_generation'
      });

    if (limitError) {
      console.error('Error checking usage limit:', limitError);
      throw new Error('Unable to verify usage limits');
    }

    if (!canProceed) {
      return new Response(JSON.stringify({ 
        error: 'Usage limit exceeded for plan generation this month. Please upgrade your plan.' 
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Étape 1: Vérifier la clarté de la demande
    const clarityCheckPrompt = `Analysez cette demande de projet et déterminez si elle est suffisamment claire pour créer un plan détaillé.

Demande: "${prompt}"

Répondez uniquement par JSON dans ce format :
{
  "isClear": true/false,
  "questions": ["question 1", "question 2"] // si isClear = false
}

Une demande est claire si elle contient :
- Le type d'application/projet
- L'objectif principal
- Le contexte d'utilisation

Sinon, posez 2-3 questions précises pour clarifier.`;

    const clarityResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-2025-08-07',
        messages: [{ role: 'user', content: clarityCheckPrompt }],
        max_completion_tokens: 300
      }),
    });

    const clarityData = await clarityResponse.json();
    const clarityContent = clarityData.choices[0].message.content;

    let clarityResult;
    try {
      clarityResult = JSON.parse(clarityContent);
    } catch (e) {
      clarityResult = { isClear: true, questions: [] };
    }

    // Si la demande n'est pas claire, retourner les questions
    if (!clarityResult.isClear) {
      return new Response(JSON.stringify({
        type: 'clarification_needed',
        questions: clarityResult.questions,
        message: "Votre demande nécessite quelques précisions. Pouvez-vous répondre à ces questions ?"
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Étape 2: Générer le plan complet au format mindmap
    const systemPrompt = `Vous êtes un expert en planification de projets et en analyse de marché. Créez un plan complet sous forme de mindmap structurée.

IMPORTANT: Répondez uniquement avec un JSON valide, sans texte supplémentaire.

Structure attendue :
{
  "title": "Titre du plan",
  "description": "Description du projet",
  "centralNode": {
    "id": "central",
    "title": "Nom du projet",
    "description": "Description centrale"
  },
  "branches": {
    "marketStudy": {
      "title": "Étude de marché & concurrence",
      "content": "Analyse du marché actuel",
      "competitors": ["concurrent 1", "concurrent 2"],
      "opportunities": ["opportunité 1", "opportunité 2"],
      "risks": ["risque 1", "risque 2"]
    },
    "projectDescription": {
      "title": "Description complète & détaillée",
      "summary": "Résumé narratif complet",
      "objectives": ["objectif 1", "objectif 2"],
      "targetAudience": "Description du public cible"
    },
    "technicalDocumentation": {
      "title": "Documentation technique & fonctionnelle",
      "modules": [
        {
          "name": "Module 1",
          "description": "Description du module",
          "technologies": ["tech 1", "tech 2"]
        }
      ],
      "architecture": "Description de l'architecture",
      "recommendedTools": ["outil 1", "outil 2"]
    },
    "features": [
      {
        "id": "feature-1",
        "title": "Nom de la fonctionnalité",
        "description": "Description détaillée",
        "specifications": "Spécifications techniques",
        "prompt": "Prompt détaillé prêt à l'emploi pour l'IA",
        "order": 1,
        "subFeatures": [
          {
            "id": "subfeature-1",
            "title": "Sous-fonctionnalité",
            "description": "Description",
            "specifications": "Specs",
            "prompt": "Prompt pour cette sous-feature"
          }
        ]
      }
    ],
    "pages": [
      {
        "id": "page-1",
        "title": "Nom de la page",
        "content": "Contenu de la page",
        "interactions": "Interactions utilisateur"
      }
    ],
    "visualIdentity": {
      "colors": {
        "primary": ["#couleur1", "#couleur2"],
        "secondary": ["#couleur3", "#couleur4"],
        "backgrounds": ["#couleur5", "#couleur6"],
        "texts": ["#couleur7", "#couleur8"]
      },
      "icons": ["icône 1", "icône 2"],
      "typography": {
        "fonts": ["Police 1", "Police 2"],
        "sizes": ["Taille 1", "Taille 2"]
      },
      "styles": {
        "borderRadius": "Style des arrondis",
        "shadows": "Style des ombres",
        "spacing": "Espacement"
      }
    }
  }
}

Créez un plan TRÈS DÉTAILLÉ avec au minimum 8-12 features principales et 5-8 pages.`;

    const userPrompt = `Créez un plan mindmap complet pour : ${prompt}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-2025-08-07',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_completion_tokens: 4000
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const assistantMessage = data.choices[0].message.content;

    let planData;
    try {
      planData = JSON.parse(assistantMessage);
      // Validation de la structure mindmap
      if (!planData.branches || !planData.centralNode) {
        throw new Error('Structure mindmap invalide');
      }
    } catch (parseError) {
      console.error('Failed to parse OpenAI response as JSON:', parseError);
      // Fallback: create a basic mindmap structure
      planData = {
        title: `Plan pour ${prompt.substring(0, 50)}...`,
        description: prompt,
        centralNode: {
          id: 'central',
          title: `Projet: ${prompt.substring(0, 30)}...`,
          description: 'Projet généré automatiquement'
        },
        branches: {
          marketStudy: {
            title: 'Étude de marché',
            content: 'Analyse du marché à définir',
            competitors: ['À identifier'],
            opportunities: ['À analyser'],
            risks: ['À évaluer']
          },
          projectDescription: {
            title: 'Description du projet',
            summary: prompt,
            objectives: ['Objectif principal à définir'],
            targetAudience: 'Public cible à identifier'
          },
          technicalDocumentation: {
            title: 'Documentation technique',
            modules: [{ name: 'Module principal', description: 'À définir', technologies: ['À déterminer'] }],
            architecture: 'Architecture à concevoir',
            recommendedTools: ['Outils à sélectionner']
          },
          features: [
            {
              id: 'feature-1',
              title: 'Fonctionnalité principale',
              description: 'Fonctionnalité à développer',
              specifications: 'Spécifications à définir',
              prompt: 'Développez la fonctionnalité principale du projet',
              order: 1
            }
          ],
          pages: [
            {
              id: 'page-1',
              title: 'Page d\'accueil',
              content: 'Page principale de l\'application',
              interactions: 'Interactions utilisateur de base'
            }
          ],
          visualIdentity: {
            colors: {
              primary: ['#3b82f6', '#1d4ed8'],
              secondary: ['#10b981', '#059669'],
              backgrounds: ['#f8fafc', '#ffffff'],
              texts: ['#1f2937', '#374151']
            },
            icons: ['Icônes modernes', 'Style cohérent'],
            typography: {
              fonts: ['Inter', 'System UI'],
              sizes: ['14px', '16px', '20px', '24px']
            },
            styles: {
              borderRadius: '8px pour les éléments, 12px pour les cartes',
              shadows: 'Ombres subtiles avec transparence',
              spacing: 'Espacement cohérent de 4px, 8px, 16px, 24px'
            }
          }
        }
      };
    }

    // Save the plan to Supabase if projectId is provided
    if (projectId) {
      const { data: savedPlan, error: saveError } = await supabaseService
        .from('plans')
        .insert([{
          project_id: projectId,
          title: planData.title,
          description: planData.description,
          etapes: planData.branches?.features || [],
          mindmap_data: planData,
          plan_type: 'mindmap',
          status: 'draft'
        }])
        .select()
        .single();

      if (saveError) {
        console.error('Error saving plan:', saveError);
        throw saveError;
      }

      // Record usage
      const { error: usageError } = await supabaseService
        .rpc('record_usage', {
          p_user_id: userData.user.id,
          p_action_type: 'plan_generation',
          p_project_id: projectId
        });

      if (usageError) {
        console.error('Error recording usage:', usageError);
      }

      return new Response(JSON.stringify({
        ...planData,
        id: savedPlan.id,
        saved: true,
        type: 'mindmap_plan'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Return the plan data without saving
    return new Response(JSON.stringify({
      ...planData,
      type: 'mindmap_plan'
    }), {
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