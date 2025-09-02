import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to call AI with fallback
async function callAIWithFallback(messages: any[], model: string, maxTokens?: number, temperature?: number) {
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  const groqApiKey = Deno.env.get('GROQ_API_KEY');

  // Try OpenAI first
  if (openAIApiKey) {
    try {
      console.log('Attempting OpenAI API call...');
      const body: any = {
        model,
        messages,
      };

      // Add temperature only for compatible models
      if (!model.includes('gpt-5') && !model.includes('o3') && !model.includes('o4') && !model.includes('gpt-4.1')) {
        body.temperature = temperature || 0.7;
      }

      // Use max_completion_tokens for newer models
      if (model.includes('gpt-5') || model.includes('o3') || model.includes('o4') || model.includes('gpt-4.1')) {
        if (maxTokens) body.max_completion_tokens = maxTokens;
      } else {
        if (maxTokens) body.max_tokens = maxTokens;
      }

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const data = await response.json();
        return data.choices[0].message.content;
      } else {
        const errorText = await response.text();
        console.log(`OpenAI failed with status ${response.status}: ${errorText}, trying Groq...`);
      }
    } catch (error) {
      console.log('OpenAI error:', error, 'trying Groq...');
    }
  }

  // Fallback to Groq with supported model
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
          model: 'llama-3.1-8b-instant', // Updated to supported Groq model
          messages,
          max_tokens: maxTokens || 4000,
          temperature: temperature || 0.7,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.choices[0].message.content;
      } else {
        const errorText = await response.text();
        console.error(`Groq API error ${response.status}: ${errorText}`);
        throw new Error(`Groq API error: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error('Groq error:', error);
      throw new Error(`Both OpenAI and Groq APIs failed. Last error: ${error.message}`);
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
    const { prompt, projectId, conversationHistory = [] } = await req.json();
    console.log('Generating plan for project:', projectId);

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

    const clarityContent = await callAIWithFallback(
      [{ role: 'user', content: clarityCheckPrompt }],
      'gpt-5-2025-08-07',
      300
    );
    
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
    const systemPrompt = `Vous etes un expert en planification de projets, architecture logicielle, etude de marche et design. Creez un plan ultra-detaille sous forme de mindmap structuree.

IMPORTANT: Repondez uniquement avec un JSON valide, sans texte supplementaire. Tous les contenus textuels doivent etre en MARKDOWN avec syntaxe complete et des descriptions TRES DETAILLEES basees sur le type de produit specifique.

NOUVEAU: Pour l'identite visuelle, incluez des prompts detailles pour chaque etape d'execution.

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
  "marketStudy": {
    "title": "Etude de marche complete",
    "marketSize": "## Taille du marche\\n\\n### Marche total addressable (TAM)\\n- Estimation quantitative du marche global\\n- Sources et methodologie d'estimation\\n\\n### Marche addressable serviceable (SAM)\\n- Segment de marche realiste\\n- Contraintes geographiques et demographiques\\n\\n### Marche obtenable (SOM)\\n- Part de marche realisable a court/moyen terme",
    "competitiveAnalysis": "## Analyse concurrentielle\\n\\n### Concurrents directs\\n- Analyse detaillee des 3-5 principaux concurrents\\n- Forces et faiblesses de chacun\\n- Positionnement prix et fonctionnalites\\n\\n### Concurrents indirects\\n- Solutions alternatives utilisees par la cible\\n- Menaces de substitution\\n\\n### Analyse SWOT\\n- Strengths: Forces du projet\\n- Weaknesses: Faiblesses identifiees\\n- Opportunities: Opportunites de marche\\n- Threats: Menaces concurrentielles",
    "targetSegments": "## Segments de marche\\n\\n### Segmentation primaire\\n- Criteres de segmentation (demographiques, comportementaux, geographiques)\\n- Description detaillee de chaque segment\\n- Taille et potentiel de chaque segment\\n\\n### Personas detailles\\n- 3-5 personas principaux avec demographics, motivations, pain points\\n- Parcours client type pour chaque persona\\n- Canaux de communication preferes",
    "marketTrends": "## Tendances du marche\\n\\n### Tendances actuelles\\n- Evolution du marche sur les 2-3 dernieres annees\\n- Facteurs de croissance identifiees\\n\\n### Tendances futures\\n- Projections sur les 3-5 prochaines annees\\n- Technologies emergentes impactantes\\n- Changements reglementaires anticipes",
    "entryBarriers": "## Barrieres a l'entree\\n\\n### Barrieres techniques\\n- Complexite technologique\\n- Brevets et propriete intellectuelle\\n\\n### Barrieres financieres\\n- Investissement initial requis\\n- Couts d'acquisition client\\n\\n### Barrieres reglementaires\\n- Conformite et certifications requises\\n- Licences necessaires"
  },
  "marketingStrategy": {
    "title": "Strategie marketing",
    "targetMarket": "## Marche cible\\n\\nSegments de marche identifies",
    "positioning": "## Positionnement\\n\\nPosition sur le marche",
    "channels": ["Marketing digital", "Reseaux sociaux", "SEO"],
    "budget": "## Budget marketing\\n\\nRepartition du budget",
    "kpis": ["Acquisition d'utilisateurs", "Taux de conversion", "Retention"]
  },
  "visualIdentity": {
    "title": "Identite visuelle ultra-detaillee",
    "brandPersonality": "## Personnalite de la marque\\n\\n### Traits de personnalite\\n- Description detaillee de la personnalite de marque (moderne, trustworthy, innovative, etc.)\\n- Ton de communication (formel, decontracte, expert, accessible)\\n- Valeurs vehiculees par le design\\n\\n### Positionnement visuel\\n- Style visuel adapte au secteur d'activite\\n- Differentiation par rapport aux concurrents\\n- Evolution prevue de l'identite",
    "detailedSteps": [
      {
        "step": "Recherche et inspiration",
        "description": "Analyser la concurrence et collecter des references visuelles",
        "prompt": "Analysez la concurrence dans le secteur ${productType} et proposez 5 references visuelles inspirantes pour l'identite de marque. Documentez les tendances actuelles et justifiez vos choix.",
        "deliverables": ["Planche d'inspiration", "Analyse concurrentielle", "Moodboard"],
        "duration": "3-5 jours"
      },
      {
        "step": "Definition de la palette",
        "description": "Creer une palette de couleurs coherente avec la strategie de marque",
        "prompt": "Creez une palette de couleurs complete pour ${productType} incluant : couleurs primaires (3), secondaires (3-5), neutres (5-7). Justifiez chaque choix par la psychologie des couleurs et l'adequation au secteur.",
        "deliverables": ["Palette de couleurs", "Codes couleurs (HEX, RGB, CMYK, HSL)", "Guide d'usage et contrastes"],
        "duration": "2-3 jours"
      },
      {
        "step": "Selection typographique",
        "description": "Choisir et associer les polices pour creer une hierarchie visuelle",
        "prompt": "Selectionnez 2-3 polices complementaires pour ${productType}. Creez un systeme typographique complet avec hierarchie (H1-H6, body, caption, labels) et justifiez vos choix selon la lisibilite et la personnalite de marque.",
        "deliverables": ["Systeme typographique", "Exemples d'application", "Licences des polices", "Guide de bonnes pratiques"],
        "duration": "2-3 jours"
      },
      {
        "step": "Creation du logo",
        "description": "Concevoir le logo principal et ses declinaisons",
        "prompt": "Concevez 3 variations de logo pour ${productType} : version principale, version simplifiee, version monochrome. Explorez differents concepts (wordmark, pictogramme, combine) et testez la scalabilite.",
        "deliverables": ["3 concepts de logo", "Declinaisons (couleur, N&B, monochrome)", "Versions responsive", "Fichiers vectoriels"],
        "duration": "5-7 jours"
      },
      {
        "step": "Applications visuelles",
        "description": "Decliner l'identite sur differents supports",
        "prompt": "Appliquez l'identite visuelle de ${productType} sur tous les supports : carte de visite, en-tete de lettre, signature email, favicon, merchandise. Montrez la coherence et l'adaptabilite du systeme.",
        "deliverables": ["Mockups des applications", "Templates editables", "Guide d'utilisation complet", "Assets finaux"],
        "duration": "4-6 jours"
      },
      {
        "step": "Systeme de design digital",
        "description": "Creer le design system pour les interfaces digitales",
        "prompt": "Developpez un design system complet pour ${productType} incluant : composants UI, etats d'interaction, grilles, espacements, animations. Assurez-vous de la coherence sur tous les ecrans.",
        "deliverables": ["Design tokens", "Bibliotheque de composants", "Guidelines UI/UX", "Prototypes interactifs"],
        "duration": "7-10 jours"
      }
    ],
    "colorSystem": {
      "primaryColors": {
        "main": "#000000",
        "description": "## Couleur principale\\n\\n### Utilisation\\n- Couleur dominante pour les CTA et elements importants\\n- Psychologie de la couleur adaptee au produit\\n- Variantes (light, dark, muted)\\n\\n### Applications\\n- Headers et navigation\\n- Boutons d'action principaux\\n- Highlights et accents visuels",
        "variants": ["#1a1a1a", "#333333", "#4d4d4d"]
      },
      "secondaryColors": {
        "main": "#666666",
        "description": "## Couleurs secondaires\\n\\n### Palette harmonieuse\\n- Couleurs complementaires basees sur la theorie des couleurs\\n- Adaptation selon le type de produit (tech, creative, business, etc.)\\n- Contraste et accessibilite WCAG",
        "variants": ["#808080", "#999999", "#b3b3b3"]
      },
      "accent": "#FF6B35",
      "semantic": {
        "success": "#10B981",
        "warning": "#F59E0B", 
        "error": "#EF4444",
        "info": "#3B82F6"
      },
      "neutrals": ["#F8F9FA", "#E9ECEF", "#DEE2E6", "#CED4DA"],
      "gradients": ["linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)"]
    },
    "typography": {
      "fontStrategy": "## Strategie typographique\\n\\n### Selection des polices\\n- Police principale adaptee au secteur (tech: sans-serif moderne, luxury: serif elegant, creative: display unique)\\n- Hierarchie typographique complete\\n- Lisibilite multi-device",
      "headings": {
        "family": "Inter Bold",
        "sizes": ["4rem", "3rem", "2.25rem", "1.875rem", "1.5rem", "1.25rem"],
        "lineHeights": ["1.1", "1.2", "1.3"],
        "letterSpacing": ["-0.025em", "0", "0.025em"]
      },
      "body": {
        "family": "Inter Regular",
        "sizes": ["1rem", "0.875rem", "0.75rem"],
        "lineHeights": ["1.6", "1.5", "1.4"]
      },
      "display": {
        "family": "Inter Black",
        "usage": "Titres hero et elements de forte visibilite"
      }
    },
    "layoutPrinciples": {
      "spacing": "## Systeme d'espacement\\n\\n### Grille de base\\n- Unite de base: 8px ou 4px selon la densite\\n- Multiplicateurs harmonieux (1x, 1.5x, 2x, 3x, 4x, 6x, 8x)\\n- Adaptation responsive automatique\\n\\n### Compositions\\n- Layouts adaptes au type de contenu\\n- Equilibre visuel et breathing room\\n- Focus sur la hierarchie visuelle",
      "grid": "## Systeme de grille\\n\\n### Breakpoints\\n- Mobile: 320px-768px\\n- Tablet: 768px-1024px\\n- Desktop: 1024px+\\n\\n### Colonnes et gutters\\n- Grille flexible 12 colonnes\\n- Gutters adaptatifs selon l'ecran",
      "components": "## Composition des composants\\n\\n### Cards et containers\\n- Styles de cartes selon le contexte\\n- Ombres et elevations\\n- Borders et radius harmonieux\\n\\n### Buttons et interactions\\n- Etats (default, hover, active, disabled)\\n- Animations micro-interactions\\n- Feedback visuel immediate"
    },
    "designTokens": {
      "spacing": ["0.25rem", "0.5rem", "1rem", "1.5rem", "2rem", "3rem", "4rem"],
      "borderRadius": ["0.25rem", "0.5rem", "1rem", "999px"],
      "shadows": [
        "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
        "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
        "0 10px 15px -3px rgba(0, 0, 0, 0.1)"
      ],
      "animations": {
        "duration": ["150ms", "300ms", "500ms"],
        "easing": ["ease-in-out", "cubic-bezier(0.4, 0, 0.2, 1)"]
      }
    },
    "componentLibrary": "## Bibliotheque de composants\\n\\n### Composants de base\\n- Buttons (primary, secondary, tertiary, ghost)\\n- Inputs et forms avec validation visuelle\\n- Cards avec variantes selon le contenu\\n- Modals et overlays\\n\\n### Composants avances\\n- Navigation adaptee au produit\\n- Tableaux et data display\\n- Charts et visualisations\\n- Media players et galleries\\n\\n### Specifications techniques\\n- Props et variants pour chaque composant\\n- Etats d'interaction detailles\\n- Responsive behavior automatique",
    "brandAssets": "## Assets de marque\\n\\n### Logo et variations\\n- Logo principal avec versions monochromes\\n- Favicon et app icons\\n- Watermarks et signatures\\n\\n### Iconographie\\n- Style d'icones coherent (outline, filled, duotone)\\n- Bibliotheque d'icones custom si necessaire\\n- Pictogrammes et illustrations\\n\\n### Imagery guidelines\\n- Style photographique ou illustratif\\n- Filtres et traitements d'image\\n- Placeholder et fallback images"
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

INSTRUCTIONS SPECIALES:
1. ADAPTEZ tout le contenu au TYPE SPECIFIQUE de produit demande (e-commerce, SaaS, mobile app, etc.)
2. Pour l'etude de marche: recherchez des donnees realistes selon le secteur
3. Pour l'identite visuelle: proposez des choix esthetiques coherents avec l'industrie
4. Pour les features: listez des fonctionnalites SPECIFIQUES au domaine d'application
5. Pour la strategie marketing: adaptez aux canaux pertinents pour la cible

Creez un plan ULTRA-COMPLET avec minimum 15-20 features detaillees, chaque feature ayant 3-5 sous-features avec des prompts precis pour l'IA.

IMPORTANT: Votre reponse DOIT être uniquement un JSON valide, sans texte avant ou après. Utilisez exactement la structure JSON fournie ci-dessus.`;

    const userPrompt = `Creez un plan mindmap complet au format JSON pour : ${contextualPrompt}

RAPPEL: Retournez UNIQUEMENT le JSON valide, sans markdown, sans explication, sans texte additionnel.`;

    const generatedPlan = await callAIWithFallback([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ], 'gpt-5-2025-08-07', 4000);

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
