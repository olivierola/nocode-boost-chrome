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
    const { prompt, projectId, conversationHistory = [] } = await req.json();
    console.log('Generating plan for project:', projectId);

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Check authentication and usage limits
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

    // Build contextual prompt with conversation history
    let contextualPrompt = prompt;
    if (conversationHistory.length > 0) {
      const historyContext = conversationHistory
        .slice(-10)
        .map((msg: any) => `${msg.role}: ${msg.content}`)
        .join('\n');
      contextualPrompt = `Contexte de la conversation precedente:\n${historyContext}\n\nNouvelle demande: ${prompt}`;
    }

    // Step 1: Check if the request is clear enough
    const clarityCheckPrompt = `Analysez cette demande de projet et determinez si elle est suffisamment claire pour creer un plan detaille.

${contextualPrompt}

Repondez uniquement par JSON dans ce format :
{
  "isClear": true/false,
  "questions": ["question 1", "question 2"] // si isClear = false
}

Une demande est claire si elle contient :
- Le type d'application/projet
- L'objectif principal  
- Le contexte d'utilisation

IMPORTANT: Si le contexte de conversation precedente contient deja ces informations, considerez la demande comme claire meme si la nouvelle demande seule semble incomplete.`;

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

    if (!clarityResponse.ok) {
      const errorData = await clarityResponse.json();
      console.error('OpenAI API error during clarity check:', errorData);
      throw new Error(`OpenAI API error: ${clarityResponse.status}`);
    }

    const clarityData = await clarityResponse.json();
    const clarityContent = clarityData.choices?.[0]?.message?.content;
    
    if (!clarityContent) {
      throw new Error('No response received from OpenAI for clarity check');
    }

    let clarityResult;
    try {
      clarityResult = JSON.parse(clarityContent);
    } catch (e) {
      clarityResult = { isClear: true, questions: [] };
    }

    // If request is not clear, return questions
    if (!clarityResult.isClear) {
      return new Response(JSON.stringify({
        type: 'clarification_needed',
        questions: clarityResult.questions,
        message: "Votre demande necessite quelques precisions. Pouvez-vous repondre a ces questions ?"
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Step 2: Generate comprehensive mindmap plan
    const systemPrompt = `Vous etes un expert en planification de projets et architecture logicielle. Creez un plan detaille sous forme de mindmap structuree.

IMPORTANT: Repondez uniquement avec un JSON valide, sans texte supplementaire. Tous les contenus textuels doivent etre en MARKDOWN avec syntaxe complete.

Structure attendue (TOUS LES CHAMPS OBLIGATOIRES):
{
  "title": "Titre du plan complet",
  "description": "Description markdown du projet avec contexte detaille",
  "mainIdea": {
    "concept": "## Concept principal\\n\\nDescription de l'idee maitresse du projet",
    "vision": "## Vision du projet\\n\\nVision a long terme",
    "mission": "## Mission\\n\\nMission et objectifs principaux",
    "valueProposition": "## Proposition de valeur\\n\\nCe qui rend le projet unique"
  },
  "productSummary": {
    "overview": "## Resume complet du produit\\n\\nDescription detaillee",
    "targetAudience": "## Public cible\\n\\nPersonas detailles",
    "problemSolution": "## Probleme et solution\\n\\nProbleme resolu et solution apportee",
    "businessModel": "## Modele economique\\n\\nSources de revenus et strategie",
    "mvpDefinition": "## Definition du MVP\\n\\nFeatures essentielles du produit minimum viable"
  },
  "technicalDocumentation": {
    "title": "Documentation technique & Architecture",
    "architecture": "## Architecture systeme\\n\\n### Vue d'ensemble\\n\`\`\`\\n[Frontend] -> [API Gateway] -> [Services] -> [Database]\\n\`\`\`",
    "technologiesStack": {
      "frontend": ["React", "TypeScript", "Tailwind CSS"],
      "backend": ["Supabase", "PostgreSQL", "Edge Functions"],
      "deployment": ["Vercel", "Supabase Hosting"],
      "tools": ["Git", "VS Code", "Figma"]
    },
    "database": {
      "type": "PostgreSQL (Supabase)",
      "schema": "## Schema de base de donnees\\n\\n### Tables principales\\n\\n\`\`\`sql\\nCREATE TABLE users (\\n  id UUID PRIMARY KEY,\\n  email VARCHAR UNIQUE\\n);\\n\`\`\`",
      "tables": [
        {
          "name": "users",
          "description": "Table des utilisateurs",
          "fields": ["id", "email", "created_at"],
          "relations": ["profiles", "projects"]
        }
      ]
    },
    "apis": [
      {
        "name": "API Authentication",
        "description": "## API de gestion des utilisateurs",
        "endpoints": [
          {
            "method": "POST",
            "path": "/auth/login",
            "description": "Connexion utilisateur"
          }
        ]
      }
    ]
  },
  "roadmap": {
    "title": "Roadmap detaillee",
    "totalDuration": "6 mois de developpement",
    "phases": [
      {
        "id": "phase-1",
        "name": "Phase 1 - Foundation & Setup",
        "duration": "4 semaines",
        "description": "## Phase 1: Fondations\\n\\nSetup initial du projet",
        "deliverables": ["Setup projet", "Architecture de base", "Authentification"],
        "milestones": ["Semaine 2: Setup termine", "Semaine 4: Auth fonctionnelle"]
      }
    ]
  },
  "features": [
    {
      "id": "feature-auth",
      "title": "Authentification utilisateur",
      "description": "## Systeme d'authentification complet\\n\\nGestion des utilisateurs",
      "priority": "haute",
      "complexity": "moyenne",
      "estimatedTime": "40 heures",
      "subFeatures": [
        {
          "id": "auth-login",
          "title": "Page de connexion",
          "description": "Interface de connexion utilisateur",
          "prompt": "Creez une page de connexion avec React Hook Form et validation Zod"
        }
      ],
      "prompt": "Implementez un systeme d'authentification complet avec Supabase Auth",
      "acceptanceCriteria": ["Connexion fonctionnelle", "Validation des formulaires"]
    }
  ],
  "pages": [
    {
      "id": "home",
      "name": "Page d'accueil",
      "description": "## Page d'accueil\\n\\nLanding page principale",
      "sections": [
        {
          "id": "hero",
          "name": "Section Hero",
          "description": "Section d'accroche principale",
          "components": ["HeroTitle", "HeroDescription", "CTAButton"]
        }
      ],
      "visualIdentity": {
        "colorScheme": "primary et accent",
        "typography": "headings modernes",
        "layout": "centree avec espacement genereux"
      }
    }
  ],
  "marketingStrategy": {
    "title": "Strategie marketing",
    "targetMarket": "## Marche cible\\n\\nSegments de marche identifies",
    "positioning": "## Positionnement\\n\\nPosition sur le marche",
    "channels": ["Marketing digital", "Reseaux sociaux", "SEO"],
    "budget": "## Budget marketing\\n\\nRepartition du budget",
    "kpis": ["Acquisition d'utilisateurs", "Taux de conversion", "Retention"]
  },
  "visualIdentity": {
    "title": "Identite visuelle globale",
    "brandGuidelines": "## Guidelines de marque\\n\\nRegles d'usage de la marque",
    "colorPalette": {
      "primary": "#000000",
      "secondary": "#666666", 
      "accent": "#FF6B35"
    },
    "typography": {
      "headings": "Inter Bold",
      "body": "Inter Regular"
    },
    "designSystem": "## Systeme de design\\n\\nComposants et tokens de design"
  },
  "security": {
    "title": "Plan de securisation",
    "authentication": "## Authentification\\n\\nStrategies d'authentification securisee",
    "dataProtection": "## Protection des donnees\\n\\nChiffrement et stockage securise",
    "accessControl": "## Controle d'acces\\n\\nGestion des permissions et roles",
    "compliance": "## Conformite\\n\\nRGPD et autres reglementations",
    "bestPractices": [
      "Validation cote serveur",
      "Chiffrement des donnees sensibles",
      "Audit trails",
      "Rate limiting"
    ]
  },
  "startupPrompt": {
    "title": "Prompt de demarrage",
    "initialSetup": "## Setup initial\\n\\nCommandes pour initialiser le projet",
    "firstSteps": "## Premieres etapes\\n\\n1. Cloner le repository\\n2. Installer les dependances\\n3. Configurer l'environnement",
    "developmentWorkflow": "## Workflow de developpement\\n\\nProcessus de developpement recommande",
    "deploymentGuide": "## Guide de deploiement\\n\\nEtapes pour deployer en production"
  }
}

Creez un plan ULTRA-COMPLET avec minimum 15-20 features detaillees, chaque feature ayant 3-5 sous-features avec des prompts precis pour l'IA.`;

    const userPrompt = `Creez un plan mindmap complet pour : ${contextualPrompt}`;

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
    const generatedPlan = data.choices?.[0]?.message?.content;

    if (!generatedPlan) {
      throw new Error('No plan generated');
    }

    let planData;
    try {
      planData = JSON.parse(generatedPlan);
    } catch (e) {
      console.error('Failed to parse plan JSON:', e);
      throw new Error('Invalid plan format generated');
    }

    // Save the plan to database
    const { data: savedPlan, error: saveError } = await supabaseService
      .from('plans')
      .insert({
        user_id: userData.user.id,
        project_id: projectId,
        title: planData.title || 'Plan généré',
        description: planData.description || '',
        plan_data: planData,
        status: 'draft'
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving plan:', saveError);
      throw new Error('Failed to save plan');
    }

    // Record usage
    await supabaseService.rpc('record_usage', {
      p_user_id: userData.user.id,
      p_action_type: 'plan_generation',
      p_project_id: projectId
    });

    // Save conversation message
    await supabaseService.rpc('save_conversation_message', {
      p_project_id: projectId,
      p_user_id: userData.user.id,
      p_conversation_type: 'plan_generation',
      p_role: 'user',
      p_content: prompt
    });

    await supabaseService.rpc('save_conversation_message', {
      p_project_id: projectId,
      p_user_id: userData.user.id,
      p_conversation_type: 'plan_generation',
      p_role: 'assistant',
      p_content: 'Plan généré avec succès',
      p_plan_data: JSON.stringify(planData)
    });

    return new Response(JSON.stringify({
      type: 'plan_generated',
      plan: planData,
      planId: savedPlan.id,
      message: 'Plan généré avec succès !'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-plan function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Une erreur est survenue lors de la génération du plan' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});