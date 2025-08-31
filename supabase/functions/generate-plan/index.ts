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
  "centralNode": {
    "id": "central",
    "title": "Nom du projet",
    "description": "# Description centrale du projet\\n\\n**Vision** du projet avec details markdown"
  },
  "branches": {
    "marketStudy": {
      "title": "Etude de marche & Analyse concurrentielle",
      "content": "## Analyse approfondie du marche\\n\\n### Contexte economique\\n- **Taille du marche**: Details\\n- **Croissance annuelle**: Pourcentage\\n\\n### Positionnement\\nAnalyse du positionnement",
      "competitors": [
        {
          "name": "Nom concurrent",
          "description": "## Description complete\\n\\n**Forces identifiees**:\\n- Force 1 avec details\\n- Force 2 avec analyse",
          "strengths": ["Force detaillee 1", "Force detaillee 2"],
          "weaknesses": ["Faiblesse analysee 1", "Faiblesse analysee 2"],
          "marketShare": "X% du marche avec justification",
          "pricing": "### Strategie tarifaire\\n\\n- **Freemium**: Details\\n- **Premium**: Details",
          "userBase": "Nombre d'utilisateurs estime",
          "revenue": "Chiffre d'affaires estime",
          "technologies": ["Tech 1", "Tech 2"],
          "differentiators": ["Differenciateur 1", "Differenciateur 2"]
        }
      ],
      "opportunities": [
        "## Opportunite 1\\n\\n**Description**: Details\\n**Impact**: Impact estime\\n**Facilite**: Niveau de difficulte"
      ],
      "risks": [
        "## Risque 1\\n\\n**Probabilite**: Haute/Moyenne/Faible\\n**Impact**: Description\\n**Mitigation**: Plan d'action"
      ],
      "marketSize": "## Taille du marche\\n\\n- **TAM**: Total Addressable Market\\n- **SAM**: Serviceable Addressable Market\\n- **SOM**: Serviceable Obtainable Market",
      "targetMarket": "## Marche cible\\n\\n### Segments principaux\\n1. **Segment 1**: Description\\n2. **Segment 2**: Description",
      "trends": [
        "## Tendance 1\\n\\n**Impact**: Description\\n**Timeline**: Calendrier"
      ]
    },
    "projectDescription": {
      "title": "Description complete & Vision produit",
      "summary": "## Resume executif\\n\\n**Mission**: Description de la mission\\n\\n**Vision**: Description de la vision\\n\\n### Probleme resolu\\nDescription du probleme\\n\\n### Solution apportee\\nDescription de la solution",
      "objectives": [
        "## Objectif 1\\n\\n**Description**: Details\\n**KPI**: Indicateurs\\n**Timeline**: Calendrier"
      ],
      "targetAudience": "## Public cible\\n\\n### Persona 1: [Nom]\\n- **Age**: Range d'age\\n- **Profession**: Type de profession\\n- **Besoins**: Besoins identifies\\n- **Frustrations**: Points de douleur",
      "valueProposition": "## Proposition de valeur unique\\n\\n### Avantages cles\\n1. **Avantage 1**: Description\\n2. **Avantage 2**: Description\\n\\n### Differenciation\\nPoints de differenciation",
      "successMetrics": [
        "## KPI 1: Acquisition\\n\\n- **Metrique**: Nom de la metrique\\n- **Objectif**: Objectif chiffre\\n- **Mesure**: Methode de mesure"
      ],
      "businessModel": "## Modele economique\\n\\n### Sources de revenus\\n1. **Revenue Stream 1**: Description\\n2. **Revenue Stream 2**: Description\\n\\n### Couts principaux\\n- **CAC**: Customer Acquisition Cost\\n- **LTV**: Lifetime Value",
      "mvp": "## Definition du MVP\\n\\n### Features essentielles\\n1. **Core Feature 1**: Description\\n2. **Core Feature 2**: Description\\n\\n### Criteres de validation\\nCriteres de succes"
    },
    "technicalDocumentation": {
      "title": "Documentation technique & Architecture",
      "architecture": "## Architecture systeme\\n\\n### Vue d'ensemble\\n```\\n[Frontend] -> [API Gateway] -> [Services] -> [Database]\\n```\\n\\n### Microservices\\n- **Service Auth**: Gestion authentification\\n- **Service Core**: Logique metier",
      "modules": [
        {
          "name": "Module Authentication",
          "description": "## Module d'authentification\\n\\n### Responsabilites\\n- **Login/Logout**: Gestion des sessions\\n- **JWT Management**: Gestion des tokens\\n\\n### Technologies\\n- **Frontend**: React + Context\\n- **Backend**: Supabase Auth",
          "technologies": ["React Context", "Supabase Auth", "JWT"],
          "dependencies": ["Module Core", "Module Database"],
          "complexity": "moyenne",
          "endpoints": ["/api/login", "/api/logout", "/api/refresh"],
          "database": ["users", "sessions", "permissions"]
        }
      ],
      "recommendedTools": [
        "## React + TypeScript\\n\\n**Justification**: Ecosysteme mature\\n**Alternatives**: Vue.js, Angular",
        "## Supabase\\n\\n**Avantages**: Backend as a Service\\n**Limitations**: Vendor lock-in"
      ],
      "database": {
        "type": "PostgreSQL (Supabase)",
        "schema": "## Schema de base de donnees\\n\\n### Tables principales\\n\\n#### users\\n```sql\\nCREATE TABLE users (\\n  id UUID PRIMARY KEY,\\n  email VARCHAR UNIQUE,\\n  created_at TIMESTAMP\\n);\\n```",
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
          "name": "API Authentification",
          "description": "## API de gestion des utilisateurs\\n\\n### Endpoints\\n- **POST** /auth/login\\n- **POST** /auth/register",
          "endpoints": [
            {
              "method": "POST",
              "path": "/auth/login",
              "description": "Connexion utilisateur",
              "parameters": ["email", "password"],
              "response": "JWT token + user data"
            }
          ]
        }
      ],
      "security": [
        "## Authentification\\n\\n- **JWT** avec refresh tokens\\n- **OAuth 2.0** pour connexions sociales",
        "## Protection des donnees\\n\\n- **Chiffrement** en transit (HTTPS)\\n- **Validation** cote serveur"
      ]
    },
    "timeline": {
      "title": "Planning & Roadmap detaille",
      "totalDuration": "6 mois de developpement",
      "phases": [
        {
          "id": "phase-1",
          "name": "Phase 1 - Foundation & MVP",
          "duration": "8 semaines",
          "description": "## Phase 1: Fondations\\n\\n### Objectifs\\n- **Setup** du projet\\n- **Authentification**\\n- **Interface** de base",
          "deliverables": [
            "Setup projet complet avec CI/CD",
            "Interface d'authentification fonctionnelle",
            "Dashboard utilisateur basique"
          ],
          "milestones": [
            "Semaine 2: Setup technique termine",
            "Semaine 4: Auth fonctionnelle",
            "Semaine 6: Dashboard MVP"
          ]
        }
      ]
    },
    "team": {
      "title": "Equipe & Ressources detaillees",
      "roles": [
        {
          "role": "Lead Developer",
          "description": "## Lead Developer\\n\\n### Responsabilites\\n- **Architecture** technique\\n- **Code review**\\n- **Mentoring** equipe",
          "skills": [
            "React/TypeScript (Expert)",
            "Node.js/PostgreSQL (Avance)",
            "Architecture logicielle"
          ],
          "timeAllocation": "100% pendant 6 mois"
        }
      ]
    },
    "features": [
      {
        "id": "feature-auth",
        "title": "Systeme d'authentification complet",
        "description": "## Authentification utilisateur\\n\\n### Fonctionnalites\\n- **Inscription/Connexion** email/password\\n- **OAuth** Google, GitHub\\n- **Reset password**\\n- **Verification email**",
        "specifications": "## Specifications techniques\\n\\n### Frontend\\n- **React Hook Form** pour la validation\\n- **Zod** pour les schemas\\n\\n### Backend\\n- **Supabase Auth**\\n- **JWT** avec refresh tokens",
        "prompt": "Creez un systeme d'authentification complet avec React et Supabase. Implementez :\\n\\n1. **Page de connexion** avec email/password et validation en temps reel\\n2. **Page d'inscription** avec confirmation d'email\\n3. **Reset password** avec lien securise\\n4. **OAuth** Google et GitHub\\n5. **Hook useAuth** pour la gestion d'etat\\n6. **Protection de routes** avec redirections\\n7. **Interface** moderne avec Tailwind CSS\\n\\nUtilisez React Hook Form + Zod pour la validation, et Supabase Auth pour le backend.",
        "order": 1,
        "priority": "haute",
        "complexity": "moyenne",
        "estimatedTime": "40 heures",
        "dependencies": [],
        "acceptanceCriteria": [
          "Utilisateur peut creer un compte avec email",
          "Connexion avec email/password fonctionne",
          "OAuth Google/GitHub operationnel"
        ]
      }
    ]
  }
}

Creez un plan ULTRA-COMPLET avec minimum 15-20 features detaillees et 8-12 pages, chaque feature ayant 3-5 sous-features connectees avec des prompts precis pour l'IA et des specifications techniques completes.`;

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