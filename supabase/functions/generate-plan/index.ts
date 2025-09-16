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

    // Step 2: Generate comprehensive plan using new structure
    const systemPrompt = `🛠️ Prompt Système IA No-Code (version enrichie)

Tu es une IA experte en conception SaaS, spécialisée dans les environnements no-code / low-code comme Lovable.dev, Bolt, Replit, Base44.
Ta mission est de produire un plan complet et structuré pour la création d'un logiciel SaaS.

Ce plan doit inclure :

1. Documentation générale
Résumé du projet SaaS (vision, mission, cible).
Étude de marché :
Taille du marché, tendances actuelles, croissance estimée.
Profils types d'utilisateurs (personas).
Opportunités et menaces.
Analyse concurrentielle :
Identification des concurrents directs et indirects.
Analyse de leurs forces et faiblesses.
Positionnement différenciateur de ton SaaS.
Description globale du produit :
Proposition de valeur unique (USP).
Fonctionnalités clés et atouts.
Cas d'usage principaux (use cases).
Architecture générale : frontend, backend, API, DB, paiements, intégrations.
Technologies par défaut : Supabase (DB & Edge Functions), Stripe (paiements), authentification OAuth + JWT.

2. Plan d'implémentation
Prompt de démarrage global à fournir à l'IA no-code.
Liste des pages du SaaS (Landing Page, Dashboard, Profil utilisateur, Admin Panel, etc.).
Pour chaque page :
Prompt global de génération.
Liste des sections.
Pour chaque section :
Modules fonctionnels.
Contenu SEO optimisé (titres, metas, body).
Prompt dédié à l'IA.
Description fonctionnelle.

3. Backend & Base de données
Modèle de données complet (tables, colonnes, relations).
Fonctions backend (auth, CRUD, analytics, notifications).
Supabase Edge Functions par défaut.
Paiements (Stripe) avec abonnements + webhooks.

4. Plan de sécurité
Règles RBAC (roles).
Sécurisation API.
Chiffrement.
Défense XSS/CSRF/Injection.
2FA optionnel.

Pour chaque aspect, fournir un prompt IA + description technique.

IMPORTANT: Repondez uniquement avec un JSON valide selon le format attendu ci-dessous, sans texte supplementaire.

Format de réponse attendu (JSON)

{
"documentation": {
"project_overview": "Résumé clair de la vision et des objectifs du SaaS.",
"vision_objectives": {
"vision": "Description de la vision long terme du produit.",
"objectives": ["Objectif 1", "Objectif 2", "Objectif 3"]
},
"mvp": {
"user_features": [
"Inscription et authentification",
"Recherche de véhicules par lieu/dates",
"Réservation et paiement en ligne",
"Tableau de bord réservations"
],
"admin_features": [
"CRUD véhicules",
"Gestion réservations",
"Gestion utilisateurs",
"Rapports simples"
]
},
"advanced_features": [
"Vérification d'identité / KYC",
"Tarification dynamique",
"Télématique (GPS, déverrouillage à distance)",
"Programme fidélité & coupons",
"Contrats électroniques signés",
"Support chat IA intégré"
],
"market_study": {
"market_size": "Estimation de la taille du marché et sa croissance.",
"trends": ["Tendance 1", "Tendance 2"],
"personas": [
{
"persona_name": "Nom du persona",
"needs": "Besoins spécifiques",
"pain_points": "Problèmes rencontrés"
}
],
"opportunities": ["Opportunité 1", "Opportunité 2"],
"threats": ["Menace 1", "Menace 2"]
},
"competitive_analysis": {
"competitors": [
{
"name": "Nom du concurrent",
"strengths": ["Atout 1", "Atout 2"],
"weaknesses": ["Faiblesse 1", "Faiblesse 2"]
}
],
"differentiation": "Facteurs différenciateurs de notre SaaS"
},
"product_description": {
"unique_value_proposition": "Proposition de valeur unique (USP).",
"key_features": ["Fonctionnalité 1", "Fonctionnalité 2"],
"advantages": ["Avantage compétitif 1", "Avantage compétitif 2"],
"use_cases": ["Cas d'usage 1", "Cas d'usage 2"]
},
"architecture": {
"frontend": "React.js (Next.js) + React Native/Flutter pour mobile.",
"backend": "Node.js (NestJS/Express) ou Python (FastAPI) avec Supabase Edge Functions.",
"database": "PostgreSQL (relations, transactions), Redis (cache).",
"payment_system": "Stripe (paiements, abonnements, webhooks).",
"infra": "Docker/Kubernetes, CI/CD, monitoring (Grafana, Prometheus)."
}
},
"implementation_plan": {
"startup_prompt": "Prompt de démarrage global pour l'IA no-code.",
"pages": [
{
"page_name": "Nom de la page",
"description": "Description détaillée de la page et prompt",
"prompt": "Prompt global pour générer cette page.",
"sections": [
{
"section_name": "Nom de la section",
"description": "Description fonctionnelle détaillée", 
"prompt": "Prompt détaillé IA.",
"modules": [
{
"module_name": "Nom du module",
"description": "Description du module",
"prompt": "Prompt pour ce module"
}
],
"design": {
"typographie": "Description de la typographie",
"composants_reutilisables": ["Composant 1", "Composant 2"]
},
"seo_content": {
"h1": "Titre principal optimisé",
"h2": ["Sous-titre 1", "Sous-titre 2"],
"meta_description": "Description meta optimisée",
"body_text": "Texte SEO détaillé"
},
"contenus": {
"cle1": "valeur1",
"cle2": "valeur2"
}
}
]
}
]
},
"backend_database": {
"data_model": {
"tables": [
{
"table_name": "nom_table",
"columns": [
{
"name": "nom_colonne",
"type": "type_donnée",
"constraints": "contraintes"
}
],
"relations": ["relation 1", "relation 2"]
}
]
},
"backend_functions": {
"authentication": "Système d'auth avec Supabase",
"crud_operations": ["Opération 1", "Opération 2"],
"edge_functions": ["Function 1", "Function 2"]
},
"stripe_integration": {
"subscriptions": "Gestion des abonnements",
"webhooks": "Webhooks Stripe pour synchro"
}
},
"security_plan": {
"rbac": {
"roles": ["Role 1", "Role 2"],
"permissions": ["Permission 1", "Permission 2"]
},
"api_security": "Sécurisation des API",
"data_protection": "Protection des données",
"authentication": "2FA et sécurité auth"
}
}

Génère un plan complet selon cette structure pour le projet demandé.
    "public_cible": "## Public cible (personas)\\n\\nPersonas détaillés avec démographie et comportements",
    "valeur_ajoutee": "## Valeur ajoutée\\n\\nPourquoi choisir ce produit ?",
    "objectifs_smart": "## Objectifs SMART\\n\\nObjectifs mesurables avec échéances"
  },
  
  "section2_analyse_recherche": {
    "etude_marche": "## Étude de marché\\n\\nConcurrents, alternatives, pricing",
    "benchmark": "## Benchmark\\n\\nAnalyse des fonctionnalités clés des concurrents",
    "risques_contraintes": "## Risques & contraintes\\n\\nTechniques, légales, RGPD, sécurité"
  },
  
  "section3_cahier_charges": {
    "cas_usage": "## Cas d'usage / User stories\\n\\nScénarios d'utilisation détaillés",
    "mvp_vs_avance": "## MVP vs fonctionnalités avancées\\n\\nMust have vs nice to have",
    "priorisation": "## Priorisation\\n\\nMéthode MoSCoW, RICE ou Kano"
  },
  
  "section4_architecture_produit": {
    "architecture_fonctionnelle": "## Architecture fonctionnelle\\n\\nModules, services, microservices",
    "architecture_technique": {
      "frontend": "## Frontend\\n\\nFramework, design system, composants",
      "backend": "## Backend\\n\\nAPI REST/GraphQL, langage, framework",
      "database": "## Base de données\\n\\nSQL/NoSQL, schéma de données",
      "infrastructure": "## Hébergement & infrastructure\\n\\nVPS, cloud, containers, CI/CD",
      "security": "## Sécurité\\n\\nAuthentification, chiffrement, backups"
    },
    "arborescence_modules": "## Arborescence des modules\\n\\nAuth, Billing, Dashboard, etc."
  },
  "section5_architecture_application": {
    "pages": [
      {
        "id": "page-1",
        "name": "Accueil",
        "description": "## Page d'accueil\\n\\nLanding page principale avec header, sections populaires et footer optimisé conversion",
        "prompt": "Créez la page d'accueil complète responsive avec React, TypeScript et Tailwind CSS incluant toutes les sections définies",
        "sections": [
          {
            "id": "section-1",
            "name": "Header",
            "description": "## Section Header\\n\\nNavigation principale avec logo, recherche et CTA de commande",
            "prompt": "Créez un header moderne et responsive avec navigation sticky, barre de recherche intelligente et bouton CTA proéminent",
            "modules": [
              {
                "id": "module-1",
                "name": "Logo",
                "description": "## Module Logo\\n\\nLogo de l'application cliquable vers accueil",
                "prompt": "Créez un composant Logo responsive avec variantes (couleur/monochrome) et animations hover"
              },
              {
                "id": "module-2",
                "name": "Barre de recherche",
                "description": "## Module Recherche\\n\\nInput de recherche avec suggestions temps réel",
                "prompt": "Créez une barre de recherche avec auto-complétion, filtres rapides et raccourcis clavier"
              },
              {
                "id": "module-3",
                "name": "Bouton Commander",
                "description": "## Module CTA\\n\\nCall-to-action principal pour initier commande",
                "prompt": "Créez un bouton CTA attractif avec animations et compteur panier dynamique"
              }
            ],
            "design": {
              "typographie": "Titres grands (H1: 32px Inter Bold), sous-titres (18px Inter Medium), texte navigation (16px Inter Regular), hiérarchie claire avec contrastes optimisés",
              "composants_reutilisables": ["bouton primaire", "input texte avec icône", "logo responsive", "dropdown menu", "badge compteur"]
            },
            "contenus": {
              "title": "Bienvenue chez PizzaExpress",
              "subtitle": "Les meilleures pizzas artisanales livrées en 30min",
              "cta": "Commander maintenant",
              "search_placeholder": "Rechercher une pizza, ingrédient...",
              "nav_menu": "Menu, Promotions, À propos, Contact"
            }
          },
          {
            "id": "section-2", 
            "name": "Liste de pizzas populaires",
            "description": "## Section Pizzas Populaires\\n\\nShowcase des pizzas les plus commandées avec visuels appétissants",
            "prompt": "Créez une section grid responsive présentant les pizzas populaires avec lazy loading et animations d'apparition",
            "modules": [
              {
                "id": "module-4",
                "name": "Carte pizza",
                "description": "## Module Carte Pizza\\n\\nCarte produit interactive avec image, détails et actions rapides",
                "prompt": "Créez une carte pizza avec image hover, détails nutritionnels, bouton ajout panier et notation étoiles"
              },
              {
                "id": "module-5",
                "name": "Filtre rapide",
                "description": "## Module Filtres\\n\\nFiltres rapides par catégorie (végé, épicée, etc.)",
                "prompt": "Créez des filtres visuels avec badges cliquables et compteurs de résultats"
              }
            ],
            "design": {
              "typographie": "Noms pizzas (20px Inter Bold), prix (18px Inter SemiBold couleur accent), descriptions (14px Inter Regular), badges (12px Inter Medium)",
              "composants_reutilisables": ["carte produit", "bouton secondaire", "badge prix", "rating étoiles", "image avec placeholder", "tooltip ingrédients"]
            },
            "contenus": {
              "section_title": "Nos pizzas populaires",
              "section_subtitle": "Les préférées de nos clients",
              "pizza_name": "Margherita Artisanale",
              "price": "12,90 €",
              "description": "Tomate San Marzano, mozzarella di bufala, basilic frais, huile d'olive extra vierge",
              "rating": "4.8/5 (127 avis)",
              "filter_categories": "Toutes, Classiques, Végétariennes, Épicées, Spécialités"
            }
          }
        ]
      },
      {
        "id": "page-2",
        "name": "Catalogue pizzas", 
        "description": "## Page Catalogue\\n\\nCatalogue complet avec système de filtrage avancé et pagination",
        "prompt": "Créez une page catalogue complète avec filtres multiples, tri personnalisable, recherche avancée et pagination infinie",
        "sections": [
          {
            "id": "section-3",
            "name": "Filtres et recherche",
            "description": "## Section Filtres\\n\\nSystème de filtrage multicritères avec sidebar responsive",
            "prompt": "Créez une sidebar de filtres collapsible avec recherche, catégories, prix, allergènes et ratings",
            "modules": [
              {
                "id": "module-6",
                "name": "Filtre catégorie",
                "description": "## Module Filtres Catégories\\n\\nCheckboxes organisées par types de pizzas",
                "prompt": "Créez des filtres par catégorie avec compteurs de résultats et reset rapide"
              }
            ],
            "design": {
              "typographie": "Titres filtres (16px Inter SemiBold), labels (14px Inter Regular), compteurs (12px Inter Regular gris)",
              "composants_reutilisables": ["checkbox personnalisé", "slider prix", "dropdown catégories", "tag filtre actif", "bouton reset"]
            },
            "contenus": {
              "filter_title": "Filtrer par",
              "categories": "Classiques, Végétariennes, Vegan, Épicées, Spécialités, Sans gluten",
              "price_range": "Prix : 8€ - 25€", 
              "dietary": "Régimes : Végétarien, Vegan, Sans gluten, Sans lactose"
            }
          }
        ]
      },
      {
        "id": "page-3",
        "name": "Personnalisation pizza",
        "description": "## Page Personnalisation\\n\\nInterface step-by-step pour créer sa pizza sur mesure",
        "prompt": "Créez un configurateur pizza interactif avec preview 3D, calcul prix temps réel et sauvegarde personnalisations",
        "sections": [
          {
            "id": "section-4", 
            "name": "Sélection base",
            "description": "## Section Base Pizza\\n\\nChoix pâte, taille et sauce avec prix dynamique",
            "prompt": "Créez une interface de sélection base avec preview visuel, informations nutritionnelles et prix impacts",
            "modules": [
              {
                "id": "module-7",
                "name": "Sélecteur pâte",
                "description": "## Module Pâte\\n\\nSélection type de pâte avec preview et descriptions",
                "prompt": "Créez un sélecteur pâte avec images, descriptions détaillées et impact nutritionnel"
              }
            ],
            "design": {
              "typographie": "Titres étapes (24px Inter Bold), options (16px Inter Medium), descriptions (14px Inter Regular), prix (16px Inter Bold couleur accent)",
              "composants_reutilisables": ["radio button visuel", "card sélection", "badge prix impact", "tooltip informatif", "progress bar étapes"]
            },
            "contenus": {
              "section_title": "Choisissez votre base",
              "step_indicator": "Étape 1/4",
              "pate_fine": "Pâte fine traditionnelle (+0€)",
              "pate_epaisse": "Pâte épaisse américaine (+2€)",
              "pate_wholefait": "Pâte complète (+1,5€)"
            }
          }
        ]
      }
    ]
  },
  
  "section6_design_ux": {
    "wireframes": "## Wireframes & maquettes\\n\\nFigma design system",
    "arborescence": "## Arborescence des pages\\n\\nParcours utilisateurs",
    "design_system": "## UI/UX design system\\n\\nTypographie, couleurs, composants"
  },
  
  "section7_plan_technique": {
    "schema_bdd": "## Schéma de la BDD\\n\\nTables, relations, index",
    "apis_endpoints": "## APIs & endpoints\\n\\nListe détaillée avec paramètres",
    "modele_donnees": "## Modèle de données\\n\\nJSON, GraphQL, DTOs",
    "standards_code": "## Standards & conventions\\n\\nRègles de codage"
  },
  
  "section8_roadmap_gestion": {
    "sprints": "## Découpage en sprints\\n\\nAgile, Scrum, Kanban",
    "backlog": "## Backlog produit\\n\\nListe de tâches avec priorité",
    "planning": "## Planning / milestones\\n\\nMVP, bêta, V1, V2"
  },
  
  "section9_tests_qualite": {
    "tests": "## Tests unitaires, d'intégration, E2E\\n\\nStratégie de tests",
    "automatisation": "## Automatisation\\n\\nCI/CD pipeline",
    "scenarios": "## Scénarios de tests\\n\\nQA, bêta-testeurs"
  },
  
  "section10_deploiement": {
    "environnements": "## Environnements\\n\\nDev, staging, prod",
    "ci_cd": "## CI/CD pipeline\\n\\nGitHub Actions, GitLab CI",
    "monitoring": "## Monitoring & observabilité\\n\\nLogs, alertes, métriques",
    "scalabilite": "## Scalabilité & résilience\\n\\nLoad balancing, CDN, caches"
  },
  
  "section11_business_monetisation": {
    "modele_economique": "## Modèle économique\\n\\nAbonnement, freemium, one-shot",
    "pricing": "## Pricing & plans\\n\\nStratégie tarifaire",
    "facturation": "## Facturation & paiements\\n\\nStripe, PayPal"
  },
  
  "section12_securite_rgpd": {
    "protection_donnees": "## Protection des données\\n\\nCryptage, anonymisation, backups",
    "conformite": "## Conformité légale\\n\\nRGPD, PCI-DSS, CNIL",
    "gestion_acces": "## Gestion des accès & rôles\\n\\nRBAC"
  },
  
  "section13_lancement_growth": {
    "plan_marketing": "## Plan marketing\\n\\nSEO, SEA, réseaux sociaux",
    "acquisition": "## Acquisition\\n\\nPublicité, contenu, partenariats",
    "retention": "## Rétention & support\\n\\nChatbot, tickets, email"
  },
  
  "section14_evolution_maintenance": {
    "feedback_loop": "## Feedback loop\\n\\nCollecte d'avis utilisateurs",
    "ameliorations": "## Améliorations continues\\n\\nNouveaux modules, refactor",
    "maintenance": "## Plan de maintenance\\n\\nMises à jour"
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
  "features": [],
  "roadmap": {
    "title": "Roadmap detaillee",
    "totalDuration": "6 mois de developpement",
    "phases": []
  },
  "marketStudy": {
    "title": "Etude de marche complete",
    "marketSize": "## Taille du marche\\n\\nAnalyse TAM, SAM, SOM",
    "competitiveAnalysis": "## Analyse concurrentielle\\n\\nConcurrents directs et indirects",
    "targetSegments": "## Segments de marche\\n\\nPersonas detailles",
    "marketTrends": "## Tendances du marche\\n\\nEvolution et projections",
    "entryBarriers": "## Barrieres a l'entree\\n\\nDefis techniques et financiers"
  }
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

    // Save or update the plan to database (upsert)
    const { data: existingPlan } = await supabaseService
      .from('plans')
      .select('id')
      .eq('project_id', projectId)
      .single();

    let savedPlan;
    if (existingPlan) {
      // Update existing plan
      const { data: updatedPlan, error: updateError } = await supabaseService
        .from('plans')
        .update({
          plan_data: planData,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingPlan.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating plan:', updateError);
        throw new Error('Failed to update plan');
      }
      savedPlan = updatedPlan;
    } else {
      // Create new plan
      const { data: newPlan, error: insertError } = await supabaseService
        .from('plans')
        .insert({
          project_id: projectId,
          plan_data: planData
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating plan:', insertError);
        throw new Error('Failed to create plan');
      }
      savedPlan = newPlan;
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
