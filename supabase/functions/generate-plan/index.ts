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

    // Construire le contexte avec l'historique de conversation
    let contextualPrompt = prompt;
    if (conversationHistory.length > 0) {
      const historyContext = conversationHistory
        .slice(-10) // Garder les 10 derniers messages
        .map((msg: any) => `${msg.role}: ${msg.content}`)
        .join('\n');
      contextualPrompt = `Contexte de la conversation précédente:\n${historyContext}\n\nNouvelle demande: ${prompt}`;
    }

    // Étape 1: Vérifier la clarté de la demande avec le contexte
    const clarityCheckPrompt = `Analysez cette demande de projet en tenant compte du contexte de conversation existant et déterminez si elle est suffisamment claire pour créer un plan détaillé.

${contextualPrompt}

Répondez uniquement par JSON dans ce format :
{
  "isClear": true/false,
  "questions": ["question 1", "question 2"] // si isClear = false
}

Une demande est claire si elle contient :
- Le type d'application/projet
- L'objectif principal  
- Le contexte d'utilisation

IMPORTANT: Si le contexte de conversation précédente contient déjà ces informations, considérez la demande comme claire même si la nouvelle demande seule semble incomplète.`;

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

    // Étape 2: Générer le plan complet au format mindmap avec plus de détails
    const systemPrompt = `Vous êtes un expert senior en planification de projets, analyse de marché, développement de produits et architecture logicielle. Créez un plan ULTRA-DÉTAILLÉ sous forme de mindmap structurée avec un maximum de spécifications techniques et business.

IMPORTANT: Répondez uniquement avec un JSON valide, sans texte supplémentaire. Tous les contenus textuels doivent être en MARKDOWN avec syntaxe complète.

NOUVELLE INSTRUCTION: Incluez des sous-étapes détaillées, des spécifications techniques avancées, des prompts prêts à l'emploi, et une structure plus approfondie.

Structure attendue (TOUS LES CHAMPS OBLIGATOIRES):
{
  "title": "Titre du plan complet",
  "description": "Description markdown du projet avec contexte détaillé",
  "centralNode": {
    "id": "central",
    "title": "Nom du projet",
    "description": "# Description centrale\n\n**Vision** du projet avec *détails* markdown"
  },
  "branches": {
    "marketStudy": {
      "title": "📊 Étude de marché & Analyse concurrentielle",
      "content": "## Analyse approfondie du marché\n\n### Contexte économique\n- **Taille du marché**: ...\n- **Croissance annuelle**: ...\n\n### Positionnement\n...",
      "competitors": [
        {
          "name": "Nom concurrent",
          "description": "## Description complète\n\n**Forces identifiées**:\n- Force 1 avec détails\n- Force 2 avec analyse",
          "strengths": ["Force détaillée 1", "Force détaillée 2", "Force détaillée 3"],
          "weaknesses": ["Faiblesse analysée 1", "Faiblesse analysée 2"],
          "marketShare": "X% du marché avec justification",
          "pricing": "### Stratégie tarifaire\n\n- **Freemium**: ...\n- **Premium**: ...",
          "userBase": "Nombre d'utilisateurs estimé",
          "revenue": "Chiffre d'affaires estimé",
          "technologies": ["Tech 1", "Tech 2"],
          "differentiators": ["Différenciateur 1", "Différenciateur 2"]
        }
      ],
      "opportunities": [
        "## Opportunité 1\n\n**Description**: ...\n**Impact**: ...\n**Facilité**: ...",
        "## Opportunité 2\n\n**Description**: ...\n**Timeline**: ..."
      ],
      "risks": [
        "## Risque 1\n\n**Probabilité**: Haute/Moyenne/Faible\n**Impact**: ...\n**Mitigation**: ...",
        "## Risque 2\n\n**Description**: ...\n**Plan B**: ..."
      ],
      "marketSize": "## Taille du marché\n\n- **TAM**: ...\n- **SAM**: ...\n- **SOM**: ...",
      "targetMarket": "## Marché cible\n\n### Segments principaux\n1. **Segment 1**: ...\n2. **Segment 2**: ...",
      "trends": [
        "## Tendance 1\n\n**Impact**: ...\n**Timeline**: ...",
        "## Tendance 2\n\n**Adoption**: ..."
      ],
      "marketingStrategy": "## Stratégie marketing\n\n### Canaux d'acquisition\n- **SEO/SEM**: ...\n- **Social Media**: ...\n- **Content Marketing**: ...",
      "pricing": {
        "strategy": "Stratégie de prix détaillée",
        "tiers": [
          {
            "name": "Gratuit",
            "price": "0€",
            "features": ["Feature 1", "Feature 2"],
            "target": "Utilisateurs occasionnels"
          }
        ]
      }
    },
    "projectDescription": {
      "title": "📝 Description complète & Vision produit",
      "summary": "## Résumé exécutif\n\n**Mission**: ...\n\n**Vision**: ...\n\n### Problème résolu\n...\n\n### Solution apportée\n...",
      "objectives": [
        "## Objectif 1\n\n**Description**: ...\n**KPI**: ...\n**Timeline**: ...",
        "## Objectif 2\n\n**Mesure de succès**: ..."
      ],
      "targetAudience": "## Public cible\n\n### Persona 1: [Nom]\n- **Âge**: ...\n- **Profession**: ...\n- **Besoins**: ...\n- **Frustrations**: ...\n\n### Persona 2: [Nom]\n...",
      "valueProposition": "## Proposition de valeur unique\n\n### Avantages clés\n1. **Avantage 1**: ...\n2. **Avantage 2**: ...\n\n### Différenciation\n...",
      "successMetrics": [
        "## KPI 1: Acquisition\n\n- **Métrique**: ...\n- **Objectif**: ...\n- **Mesure**: ...",
        "## KPI 2: Engagement\n\n- **Métrique**: ...\n- **Benchmark**: ..."
      ],
      "businessModel": "## Modèle économique\n\n### Sources de revenus\n1. **Revenue Stream 1**: ...\n2. **Revenue Stream 2**: ...\n\n### Coûts principaux\n- **CAC**: ...\n- **LTV**: ...",
      "roadmap": "## Roadmap produit\n\n### Phase 1 (0-3 mois)\n- **MVP**: ...\n\n### Phase 2 (3-6 mois)\n- **Growth**: ...",
      "mvp": "## Définition du MVP\n\n### Features essentielles\n1. **Core Feature 1**: ...\n2. **Core Feature 2**: ...\n\n### Critères de validation\n..."
    },
    "technicalDocumentation": {
      "title": "🔧 Documentation technique & Architecture",
      "architecture": "## Architecture système\n\n### Vue d'ensemble\n\`\`\`\n[Frontend] -> [API Gateway] -> [Services] -> [Database]\n\`\`\`\n\n### Microservices\n- **Service Auth**: ...\n- **Service Core**: ...",
      "modules": [
        {
          "name": "Module Authentication",
          "description": "## Module d'authentification\n\n### Responsabilités\n- **Login/Logout**: ...\n- **JWT Management**: ...\n\n### Technologies\n- **Frontend**: React + Context\n- **Backend**: Supabase Auth",
          "technologies": ["React Context", "Supabase Auth", "JWT", "OAuth 2.0"],
          "dependencies": ["Module Core", "Module Database"],
          "complexity": "moyenne",
          "endpoints": ["/api/login", "/api/logout", "/api/refresh"],
          "database": ["users", "sessions", "permissions"]
        }
      ],
      "recommendedTools": [
        "## React + TypeScript\n\n**Justification**: ...\n**Alternatives**: ...",
        "## Supabase\n\n**Avantages**: ...\n**Limitations**: ..."
      ],
      "database": {
        "type": "PostgreSQL (Supabase)",
        "schema": "## Schéma de base de données\n\n### Tables principales\n\n#### users\n\`\`\`sql\nCREATE TABLE users (\n  id UUID PRIMARY KEY,\n  email VARCHAR UNIQUE,\n  created_at TIMESTAMP\n);\n\`\`\`",
        "tables": [
          {
            "name": "users",
            "description": "Table des utilisateurs",
            "fields": ["id", "email", "created_at"],
            "relations": ["profiles", "projects"]
          }
        ],
        "relationships": "## Relations\n\n- **users** -> **profiles** (1:1)\n- **users** -> **projects** (1:N)"
      },
      "apis": [
        {
          "name": "API Authentification",
          "description": "## API de gestion des utilisateurs\n\n### Endpoints\n- **POST** /auth/login\n- **POST** /auth/register",
          "purpose": "Gestion des utilisateurs et sessions",
          "endpoints": [
            {
              "method": "POST",
              "path": "/auth/login",
              "description": "Connexion utilisateur",
              "parameters": ["email", "password"],
              "response": "JWT token + user data"
            }
          ],
          "authentication": "JWT Bearer Token",
          "rateLimit": "100 req/min par IP"
        }
      ],
      "security": [
        "## Authentification\n\n- **JWT** avec refresh tokens\n- **OAuth 2.0** pour connexions sociales",
        "## Autorisation\n\n- **RBAC** (Role-Based Access Control)\n- **RLS** (Row Level Security)",
        "## Protection des données\n\n- **Chiffrement** en transit (HTTPS)\n- **Validation** côté serveur"
      ],
      "deployment": "## Stratégie de déploiement\n\n### Environnements\n- **Dev**: Vercel Preview\n- **Staging**: Vercel Production\n- **Prod**: Vercel + CDN\n\n### CI/CD\n- **GitHub Actions**\n- **Tests automatiques**\n- **Déploiement continu**",
      "performance": "## Optimisations\n\n- **Code splitting**\n- **Lazy loading**\n- **Caching strategy**\n- **Image optimization**",
      "monitoring": "## Monitoring\n\n- **Supabase Analytics**\n- **Vercel Analytics**\n- **Error tracking**: Sentry"
    },
    "timeline": {
      "title": "📅 Planning & Roadmap détaillé",
      "totalDuration": "6 mois de développement",
      "phases": [
        {
          "id": "phase-1",
          "name": "Phase 1 - Foundation & MVP",
          "duration": "8 semaines",
          "startDate": "Semaine 1",
          "endDate": "Semaine 8",
          "description": "## Phase 1: Fondations\n\n### Objectifs\n- **Setup** du projet\n- **Authentification**\n- **Interface** de base",
          "deliverables": [
            "Setup projet complet avec CI/CD",
            "Interface d'authentification fonctionnelle",
            "Dashboard utilisateur basique",
            "API de base opérationnelle"
          ],
          "milestones": [
            "✅ Semaine 2: Setup technique terminé",
            "✅ Semaine 4: Auth fonctionnelle",
            "✅ Semaine 6: Dashboard MVP",
            "✅ Semaine 8: Tests et déploiement"
          ],
          "risks": ["Retard sur setup technique", "Complexité auth"],
          "team": ["1 Lead Dev", "1 Frontend Dev", "1 Designer"]
        }
      ],
      "criticalPath": [
        "## Setup technique\n\n**Durée**: 1 semaine\n**Bloquant pour**: Tout le développement",
        "## Authentification\n\n**Durée**: 2 semaines\n**Bloquant pour**: Features utilisateur"
      ],
      "dependencies": [
        "## External APIs\n\n- **Supabase**: Setup compte et configuration\n- **Stripe**: Integration paiements",
        "## Design System\n\n- **Validation** des maquettes\n- **Assets** graphiques"
      ],
      "resources": "## Allocation des ressources\n\n### Équipe\n- **Lead Developer**: 100% sur 6 mois\n- **Frontend Developer**: 80% sur 4 mois\n- **Designer**: 50% sur 2 mois\n\n### Budget\n- **Développement**: 50k€\n- **Outils**: 2k€\n- **Infrastructure**: 1k€"
    },
    "team": {
      "title": "👥 Équipe & Ressources détaillées",
      "roles": [
        {
          "role": "Lead Developer",
          "description": "## Lead Developer\n\n### Responsabilités\n- **Architecture** technique\n- **Code review**\n- **Mentoring** équipe",
          "skills": [
            "React/TypeScript (Expert)",
            "Node.js/PostgreSQL (Avancé)",
            "Architecture logicielle",
            "Leadership technique"
          ],
          "timeAllocation": "100% pendant 6 mois",
          "salary": "65k€/an",
          "location": "Remote/Paris",
          "startDate": "Immédiat"
        }
      ],
      "budget": {
        "development": "## Coûts de développement\n\n- **Salaires**: 180k€\n- **Freelances**: 20k€\n- **Total**: 200k€",
        "infrastructure": "## Infrastructure\n\n- **Supabase Pro**: 25€/mois\n- **Vercel Pro**: 20€/mois\n- **CDN**: 50€/mois\n- **Total annuel**: 1140€",
        "marketing": "## Marketing\n\n- **SEO/SEM**: 2k€/mois\n- **Social Ads**: 1k€/mois\n- **Content**: 500€/mois\n- **Total annuel**: 42k€",
        "tools": "## Outils\n\n- **Design**: Figma Pro (12€/mois)\n- **Dev**: GitHub Pro (4€/mois)\n- **Analytics**: Mixpanel (99€/mois)\n- **Total annuel**: 1380€",
        "total": "## Budget total première année\n\n- **Développement**: 200k€\n- **Infrastructure**: 1.14k€\n- **Marketing**: 42k€\n- **Outils**: 1.38k€\n- **Total**: 244.52k€"
      },
      "externalServices": [
        "## Supabase\n\n**Usage**: Database + Auth + Storage\n**Coût**: 25€/mois\n**Alternative**: AWS RDS",
        "## Stripe\n\n**Usage**: Paiements\n**Coût**: 2.9% + 0.30€ par transaction"
      ],
      "hiring": "## Plan de recrutement\n\n### Mois 1-2\n- **Lead Developer** (immédiat)\n- **Designer UI/UX** (semaine 2)\n\n### Mois 3-4\n- **Frontend Developer** (semaine 8)\n- **QA Tester** (semaine 12)"
    },
    "features": [
      {
        "id": "feature-auth",
        "title": "🔐 Système d'authentification complet",
        "description": "## Authentification utilisateur\n\n### Fonctionnalités\n- **Inscription/Connexion** email/password\n- **OAuth** Google, GitHub\n- **Reset password**\n- **Verification email**\n\n### Expérience utilisateur\n- **Interface** moderne et intuitive\n- **Validation** en temps réel\n- **Messages** d'erreur clairs",
        "specifications": "## Spécifications techniques\n\n### Frontend\n- **React Hook Form** pour la validation\n- **Zod** pour les schémas\n- **React Router** pour la navigation\n\n### Backend\n- **Supabase Auth**\n- **JWT** avec refresh tokens\n- **Rate limiting**\n\n### Sécurité\n- **Hachage** bcrypt\n- **Tokens** sécurisés\n- **HTTPS** obligatoire",
        "prompt": "Créez un système d'authentification complet avec React et Supabase. Implémentez :\n\n1. **Page de connexion** avec email/password et validation en temps réel\n2. **Page d'inscription** avec confirmation d'email\n3. **Reset password** avec lien sécurisé\n4. **OAuth** Google et GitHub\n5. **Hook useAuth** pour la gestion d'état\n6. **Protection de routes** avec redirections\n7. **Interface** moderne avec Tailwind CSS\n8. **Gestion d'erreurs** complète\n9. **Loading states** et feedback utilisateur\n10. **Tests** unitaires et d'intégration\n\nUtilisez React Hook Form + Zod pour la validation, et Supabase Auth pour le backend.",
        "order": 1,
        "priority": "haute",
        "complexity": "moyenne",
        "estimatedTime": "40 heures",
        "dependencies": [],
        "acceptanceCriteria": [
          "✅ Utilisateur peut créer un compte avec email",
          "✅ Connexion avec email/password fonctionne",
          "✅ OAuth Google/GitHub opérationnel",
          "✅ Reset password envoie email",
          "✅ Validation formulaires en temps réel",
          "✅ Routes protégées redirigent",
          "✅ Session persistante entre rechargements",
          "✅ Déconnexion efface la session",
          "✅ Interface responsive",
          "✅ Tests couvrent 90% du code"
        ],
        "subFeatures": [
          {
            "id": "subfeature-login",
            "title": "Page de connexion",
            "description": "## Interface de connexion\n\n- **Formulaire** email/password\n- **Validation** en temps réel\n- **OAuth** buttons",
            "specifications": "### Composants\n- **LoginForm** avec validation\n- **OAuthButtons** pour Google/GitHub\n- **LoadingSpinner** pour les états de chargement\n\n### Validation\n- Email format valide\n- Password minimum 8 caractères",
            "prompt": "Créez une page de connexion avec React Hook Form et Zod. Incluez validation temps réel, boutons OAuth, et gestion d'erreurs.",
            "estimatedTime": "8 heures",
            "parentId": "feature-auth"
          }
        ]
      }
    ],
    "pages": [
      {
        "id": "page-home",
        "title": "🏠 Page d'accueil",
        "description": "## Page d'accueil marketing\n\n### Objectifs\n- **Présenter** la valeur du produit\n- **Convertir** les visiteurs\n- **Rassurer** sur la qualité",
        "content": "## Contenu de la page\n\n### Hero Section\n- **Titre accrocheur** : \"Révolutionnez votre [domaine]\"\n- **Sous-titre** explicatif\n- **CTA principal** : \"Commencer gratuitement\"\n- **Visuel** : Screenshot ou vidéo\n\n### Features Section\n- **3-4 features** principales\n- **Icônes** explicites\n- **Descriptions** courtes\n\n### Social Proof\n- **Témoignages** clients\n- **Logos** partenaires\n- **Métriques** d'usage\n\n### Pricing\n- **3 plans** (Gratuit, Pro, Enterprise)\n- **Comparaison** features\n- **CTA** pour chaque plan\n\n### FAQ\n- **5-7 questions** fréquentes\n- **Réponses** détaillées",
        "interactions": "## Interactions utilisateur\n\n### Navigation\n- **Menu sticky** au scroll\n- **Smooth scroll** vers sections\n- **Mobile menu** hamburger\n\n### Animations\n- **Fade in** au scroll\n- **Hover effects** sur boutons\n- **Loading** states\n\n### Formulaires\n- **Newsletter** signup\n- **Contact** form",
        "components": [
          "HeroSection avec CTA",
          "FeaturesGrid avec icônes",
          "TestimonialsCarousel",
          "PricingCards avec comparaison",
          "FAQAccordion",
          "NewsletterSignup",
          "Footer avec liens"
        ],
        "wireframe": "## Structure de la page\n\n**Layout:**\n[Header] Navbar + Logo + Menu\n[Hero] Titre + CTA + Visual\n[Features] Grid 2x2 avec icones\n[Social Proof] Testimonials + Metrics\n[Pricing] 3 cartes side by side\n[FAQ] Accordeon 2 colonnes\n[Footer] Links + Newsletter",
        "seo": {
          "title": "AppName - Révolutionnez votre [domaine] | Solution N°1",
          "description": "Découvrez AppName, la solution qui transforme votre façon de [action]. Plus de 10 000 utilisateurs nous font confiance. Essai gratuit.",
          "keywords": [
            "solution [domaine]",
            "outil [action]",
            "plateforme [métier]",
            "logiciel [usage]",
            "application [secteur]"
          ],
          "ogImage": "/images/og-home.jpg",
          "structuredData": "## Schema.org\n\n**JSON-LD Structure:**\n- @type: SoftwareApplication\n- name: AppName\n- description: Description de l'application"
        },
        "performance": "## Optimisations\n\n- **Images** : WebP + lazy loading\n- **CSS** : Critical path inline\n- **JS** : Code splitting par route\n- **Fonts** : Preload + font-display swap\n\n### Métriques cibles\n- **LCP** < 2.5s\n- **FID** < 100ms\n- **CLS** < 0.1",
        "analytics": "## Tracking\n\n### Events\n- **hero_cta_click**\n- **pricing_plan_select**\n- **newsletter_signup**\n- **faq_open**\n\n### Goals\n- **Conversion** : 2% visiteurs -> inscrits\n- **Engagement** : 3 min temps moyen\n- **Bounce** : < 60%"
      }
    ],
    "visualIdentity": {
      "title": "🎨 Identité visuelle & Design System",
      "colors": {
        "primary": ["#3b82f6", "#1d4ed8"],
        "secondary": ["#10b981", "#059669"],
        "backgrounds": ["#f8fafc", "#ffffff"],
        "texts": ["#1f2937", "#374151"],
        "accent": ["#f59e0b", "#d97706"],
        "error": ["#ef4444", "#dc2626"],
        "success": ["#10b981", "#059669"],
        "warning": ["#f59e0b", "#d97706"]
      },
      "colorPalette": "## Palette de couleurs\n\n### Couleurs principales\n- **Primary Blue**: #3b82f6 (CTA, liens)\n- **Primary Dark**: #1d4ed8 (hover states)\n- **Secondary Green**: #10b981 (success, validation)\n- **Secondary Dark**: #059669 (hover success)\n\n### Couleurs neutres\n- **Background Light**: #f8fafc\n- **Background White**: #ffffff\n- **Text Dark**: #1f2937\n- **Text Medium**: #374151\n- **Text Light**: #6b7280\n\n### Couleurs système\n- **Error**: #ef4444\n- **Warning**: #f59e0b\n- **Success**: #10b981\n- **Info**: #3b82f6",
      "icons": [
        "## Style d'icônes\n\n- **Lucide React** (library principale)\n- **Style**: Outline, consistent\n- **Taille**: 16px, 20px, 24px\n- **Stroke**: 1.5px width",
        "## Icônes personnalisées\n\n- **Logo**: SVG vectoriel\n- **Favicon**: Multiple tailles\n- **App icons**: iOS/Android"
      ],
      "typography": {
        "fonts": [
          "## Font principale: Inter\n\n**Usage**: Titres, texte body\n**Weights**: 400, 500, 600, 700\n**Fallback**: system-ui, sans-serif",
          "## Font mono: JetBrains Mono\n\n**Usage**: Code, données\n**Weight**: 400\n**Fallback**: monospace"
        ],
        "hierarchy": "## Hiérarchie typographique\n\n### Headings\n- **H1**: 2.5rem (40px), font-bold\n- **H2**: 2rem (32px), font-semibold\n- **H3**: 1.5rem (24px), font-semibold\n- **H4**: 1.25rem (20px), font-medium\n\n### Body\n- **Large**: 1.125rem (18px)\n- **Base**: 1rem (16px)\n- **Small**: 0.875rem (14px)\n- **XS**: 0.75rem (12px)",
        "sizes": ["3xl", "2xl", "xl", "lg", "base", "sm", "xs"],
        "weights": ["font-normal (400)", "font-medium (500)", "font-semibold (600)", "font-bold (700)"],
        "lineHeights": ["leading-tight (1.25)", "leading-normal (1.5)", "leading-relaxed (1.625)"]
      },
      "styles": {
        "borderRadius": "## Border Radius\n\n- **Small**: 0.25rem (4px) - badges\n- **Default**: 0.5rem (8px) - buttons, cards\n- **Large**: 0.75rem (12px) - modals\n- **XL**: 1rem (16px) - containers",
        "shadows": "## Ombres\n\n### Shadow tokens\n- **sm**: 0 1px 2px rgba(0,0,0,0.05)\n- **default**: 0 1px 3px rgba(0,0,0,0.1)\n- **md**: 0 4px 6px rgba(0,0,0,0.07)\n- **lg**: 0 10px 15px rgba(0,0,0,0.1)\n- **xl**: 0 20px 25px rgba(0,0,0,0.1)\n\n### Usage\n- **Cards**: shadow-sm\n- **Buttons**: shadow-md on hover\n- **Modals**: shadow-xl",
        "spacing": "## Espacement\n\n### Scale (Tailwind)\n- **0.5**: 0.125rem (2px)\n- **1**: 0.25rem (4px)\n- **2**: 0.5rem (8px)\n- **3**: 0.75rem (12px)\n- **4**: 1rem (16px)\n- **6**: 1.5rem (24px)\n- **8**: 2rem (32px)\n- **12**: 3rem (48px)\n\n### Usage patterns\n- **Components**: p-4, p-6\n- **Sections**: py-12, py-16\n- **Grid gaps**: gap-4, gap-6",
        "animations": "## Animations\n\n### Transitions\n- **Duration**: 150ms, 300ms\n- **Timing**: ease-in-out\n- **Properties**: colors, transform, opacity\n\n### Hover effects\n- **Buttons**: scale(1.05)\n- **Cards**: translateY(-2px)\n- **Links**: color transition\n\n### Loading states\n- **Spinner**: rotate animation\n- **Skeleton**: pulse effect\n- **Progress**: width animation",
        "breakpoints": "## Responsive breakpoints\n\n- **sm**: 640px (mobile large)\n- **md**: 768px (tablet)\n- **lg**: 1024px (desktop)\n- **xl**: 1280px (large desktop)\n- **2xl**: 1536px (extra large)\n\n### Usage\n- **Mobile first** approach\n- **sm:**: styles pour tablet+\n- **lg:**: styles pour desktop+"
      },
      "branding": {
        "logo": "## Logo\n\n### Versions\n- **Horizontal**: Logo + text\n- **Vertical**: Stacked layout\n- **Icon**: Symbol seul\n- **Monochrome**: Noir/blanc\n\n### Usage\n- **Min size**: 32px height\n- **Clear space**: 2x height\n- **Backgrounds**: Préférer fonds clairs",
        "brandVoice": "## Ton de la marque\n\n### Personnalité\n- **Professionnel** mais accessible\n- **Innovant** et moderne\n- **Fiable** et sécurisé\n- **Humain** et empathique\n\n### Style d'écriture\n- **Direct** et clair\n- **Positif** et encourageant\n- **Technique** mais vulgarisé\n- **Action-oriented**",
        "brandValues": [
          "## Innovation\n\n**Description**: Toujours à l'avant-garde\n**Expression**: Features cutting-edge",
          "## Simplicité\n\n**Description**: Complexité cachée, usage simple\n**Expression**: Interfaces intuitives",
          "## Fiabilité\n\n**Description**: Disponibilité et performance\n**Expression**: 99.9% uptime"
        ]
      },
      "designSystem": "## Design System\n\n### Composants de base\n- **Button**: Variants primary, secondary, ghost\n- **Input**: Text, email, password states\n- **Card**: Content containers\n- **Modal**: Dialogs et overlays\n\n### Patterns\n- **Navigation**: Consistent across pages\n- **Forms**: Validation et feedback\n- **Data display**: Tables, lists, grids\n- **Feedback**: Toasts, alerts, loading"
    },
    "testing": {
      "title": "🧪 Tests & Assurance Qualité",
      "strategy": "## Stratégie de tests\n\n### Pyramide de tests\n1. **Unit tests** (70%): Fonctions, hooks\n2. **Integration tests** (20%): Composants + API\n3. **E2E tests** (10%): User journeys critiques\n\n### Outils\n- **Jest + Testing Library**: Unit tests\n- **MSW**: API mocking\n- **Playwright**: E2E tests\n- **Storybook**: Component testing",
      "unitTests": [
        "## Tests unitaires - Authentification\n\n### useAuth hook\n**Test example:**\ndescribe('useAuth', () => {\n  test('should login user', () => {\n    // Test login logic\n  });\n});",
        "## Tests unitaires - Utils\n\n### Validation functions\n- **validateEmail()**\n- **formatDate()**\n- **calculatePrice()**"
      ],
      "integrationTests": [
        "## Tests d'intégration - Auth Flow\n\n### Scénarios\n1. **Signup** -> Verification -> Login\n2. **Password reset** -> New password\n3. **OAuth** -> Account creation",
        "## Tests d'intégration - API\n\n### Endpoints\n- **CRUD** operations\n- **Error handling**\n- **Rate limiting**"
      ],
      "e2eTests": [
        "## E2E - User Journey\n\n### Critical paths\n1. **Onboarding** complet\n2. **Feature** principale usage\n3. **Payment** flow\n\n### Playwright tests\n**Test example:**\ntest('user can complete onboarding', async ({ page }) => {\n  // Test complete flow\n});",
        "## E2E - Cross-browser\n\n### Browsers\n- **Chrome** (primary)\n- **Firefox**\n- **Safari**\n- **Mobile** browsers"
      ],
      "performanceTests": [
        "## Performance - Load Testing\n\n### Tools: Artillery.js\n- **Ramp up**: 1-100 users/minute\n- **Duration**: 10 minutes\n- **Target**: 95% < 2s response",
        "## Performance - Frontend\n\n### Lighthouse CI\n- **Performance**: > 90\n- **Accessibility**: > 95\n- **Best Practices**: > 90\n- **SEO**: > 90"
      ],
      "securityTests": [
        "## Tests de sécurité\n\n### OWASP Top 10\n- **Injection** attacks\n- **XSS** prevention\n- **CSRF** protection\n- **Auth** bypass attempts",
        "## Security Tools\n\n- **npm audit**: Dependencies\n- **SAST**: Static analysis\n- **Penetration testing**: Manual"
      ],
      "accessibilityTests": [
        "## Tests d'accessibilité\n\n### WCAG 2.1 AA\n- **Screen readers**: NVDA, JAWS\n- **Keyboard navigation**\n- **Color contrast**: 4.5:1 minimum\n- **Focus management**",
        "## A11y Tools\n\n- **axe-core**: Automated testing\n- **Pa11y**: CI integration\n- **Manual testing**: Real users"
      ],
      "coverage": "## Couverture de tests\n\n### Targets\n- **Statements**: > 80%\n- **Branches**: > 75%\n- **Functions**: > 85%\n- **Lines**: > 80%\n\n### Exclusions\n- Configuration files\n- Type definitions\n- Dev utilities",
      "ci": "## CI/CD Testing\n\n### GitHub Actions\n**Example workflow:**\n- name: Run tests\n  run: npm run test:unit && npm run test:integration && npm run test:e2e\n\n### Quality gates\n- **Tests pass**: Required\n- **Coverage**: > threshold\n- **Linting**: No errors"
    },
    "deployment": {
      "title": "🚀 Déploiement & Infrastructure",
      "strategy": "## Stratégie de déploiement\n\n### Environments\n1. **Development**: Local + Supabase local\n2. **Staging**: Vercel Preview + Supabase staging\n3. **Production**: Vercel + Supabase production\n\n### Deployment flow\n- **Feature branch** -> Vercel preview\n- **Main branch** -> Staging auto-deploy\n- **Release tag** -> Production deploy",
      "environments": [
        "## Development\n\n### Setup local\n**Commands:**\nnpm install\nnpm run dev\n\n### Database\n- **Supabase CLI**: Local instance\n- **Migrations**: Automatic sync\n- **Seed data**: Development dataset",
        "## Staging\n\n### Purpose\n- **QA testing**\n- **Client validation**\n- **Integration testing**\n\n### Configuration\n- **Environment**: staging\n- **Database**: Supabase staging\n- **Auth**: Test providers",
        "## Production\n\n### Hosting\n- **Frontend**: Vercel\n- **Database**: Supabase\n- **CDN**: Vercel Edge Network\n- **DNS**: Cloudflare\n\n### Monitoring\n- **Uptime**: UptimeRobot\n- **Performance**: Vercel Analytics\n- **Errors**: Sentry"
      ],
      "cicd": "## Pipeline CI/CD\n\n### GitHub Actions\n**Workflow structure:**\n- name: CI/CD\n- on: push, pull_request\n- jobs: test, deploy\n- steps: checkout, setup, install, test, deploy\n\n### Key steps\n- **Test**: Unit, integration, E2E\n- **Deploy**: Automatic on main branch\n- **Tools**: GitHub Actions, Vercel"
      "monitoring": [
        "## Application Monitoring\n\n### Metrics\n- **Response time**: P95 < 200ms\n- **Error rate**: < 0.1%\n- **Uptime**: > 99.9%\n- **Throughput**: RPS tracking\n\n### Tools\n- **Vercel Analytics**: Performance\n- **Supabase Dashboard**: Database\n- **Sentry**: Error tracking",
        "## Infrastructure Monitoring\n\n### Health checks\n- **API endpoints**: /health\n- **Database**: Connection pool\n- **External services**: Dependency checks\n\n### Alerts\n- **Slack**: Critical errors\n- **Email**: Downtime alerts\n- **PagerDuty**: On-call rotation"
      ],
      "backups": "## Stratégie de sauvegarde\n\n### Database backups\n- **Supabase**: Automatic daily backups\n- **Point-in-time**: 7 days recovery\n- **Manual backups**: Before migrations\n\n### Code backups\n- **Git**: Distributed VCS\n- **GitHub**: Cloud repository\n- **Local**: Development machines\n\n### Assets backups\n- **Supabase Storage**: Multi-region\n- **CDN**: Edge caching\n- **Manual**: Critical assets download",
      "scaling": "## Stratégie de montée en charge\n\n### Frontend scaling\n- **Vercel**: Auto-scaling\n- **CDN**: Global distribution\n- **Code splitting**: Reduced bundle size\n- **Image optimization**: WebP + sizes\n\n### Database scaling\n- **Supabase**: Vertical scaling\n- **Read replicas**: Query distribution\n- **Connection pooling**: PgBouncer\n- **Caching**: Redis for sessions\n\n### Performance targets\n- **Load**: 1000 concurrent users\n- **Response**: < 200ms average\n- **Throughput**: 100 RPS\n- **Availability**: 99.9% uptime",
      "security": "## Sécurité déploiement\n\n### HTTPS\n- **Vercel**: Auto SSL certificates\n- **HSTS**: Strict transport security\n- **CSP**: Content security policy\n\n### Secrets management\n- **Vercel**: Environment variables\n- **Supabase**: Service keys\n- **GitHub**: Encrypted secrets\n\n### Security headers\n**Example configuration:**\n- X-DNS-Prefetch-Control: on\n- Strict-Transport-Security: max-age=63072000\n- X-XSS-Protection: 1; mode=block\n- X-Frame-Options: DENY\n- X-Content-Type-Options: nosniff",
      "maintenance": [
        "## Maintenance régulière\n\n### Daily\n- **Health checks**: Automated\n- **Error monitoring**: Sentry alerts\n- **Performance**: Vercel analytics\n\n### Weekly\n- **Dependency updates**: Dependabot\n- **Security patches**: npm audit\n- **Backup verification**: Restore test",
        "## Maintenance majeure\n\n### Monthly\n- **Performance review**: Metrics analysis\n- **Security audit**: OWASP check\n- **Capacity planning**: Usage trends\n\n### Quarterly\n- **Architecture review**: Tech debt\n- **Disaster recovery**: Full test\n- **Documentation**: Updates"
      ]
    },
    "noCodePlatforms": {
      "title": "🔧 Détection & Intégration Plateformes No-Code",
      "detection": "## Système de détection des plateformes\n\n### Méthode de détection\n- **DOM analysis**: Classes CSS spécifiques\n- **URL patterns**: Domaines et sous-domaines\n- **JavaScript globals**: Variables globales\n- **Meta tags**: Identifiants plateforme\n\n### Platforms supportées\n- **Webflow**: webflow.com, webflow.io\n- **Bubble**: bubble.io, run.dev\n- **Framer**: framer.com, framer.website\n- **Notion**: notion.so, notion.site\n- **Airtable**: airtable.com\n- **Glide**: glideapps.com",
      "platforms": [
        {
          "name": "Webflow",
          "domains": ["webflow.com", "webflow.io"],
          "selectors": [".w-webflow-badge", "[data-wf-page]", ".w-form"],
          "globals": ["Webflow", "_wf_refresh"],
          "icon": "🌊",
          "color": "#4353FF",
          "capabilities": {
            "errorDetection": true,
            "performanceAnalysis": true,
            "seoAudit": true,
            "accessibilityCheck": true,
            "designConsistency": true
          },
          "interactions": [
            "## Détection d'erreurs Webflow\n\n### Erreurs communes\n- **Missing alt tags** sur images\n- **Empty links** sans destination\n- **Broken interactions** JavaScript\n- **Mobile responsiveness** issues\n\n### Corrections automatiques\n- **Alt text generation** via AI\n- **Link validation** et suggestions\n- **Interaction debugging** avec logs",
            "## Optimisations performance\n\n### Image optimization\n- **WebP conversion** recommendations\n- **Lazy loading** implementation\n- **Compression** suggestions\n\n### Code cleanup\n- **Unused CSS** removal\n- **Minification** suggestions\n- **CDN** optimization"
          ],
          "prompts": [
            "Analysez cette page Webflow et identifiez tous les problèmes d'accessibilité. Pour chaque problème trouvé, proposez une correction spécifique avec le code exact à implémenter dans Webflow. Incluez :\n1. **Alt text** manquants sur les images\n2. **Contrast ratio** insuffisant\n3. **Keyboard navigation** problématique\n4. **ARIA labels** manquants\n5. **Heading hierarchy** incorrecte\n\nFormat de réponse : JSON avec problème, solution, code Webflow.",
            "Optimisez les performances de cette page Webflow. Analysez :\n1. **Images** non optimisées\n2. **CSS** inutilisé\n3. **JavaScript** bloquant\n4. **Fonts** loading\n5. **Third-party** scripts\n\nProposez des corrections avec instructions Webflow précises."
          ]
        },
        {
          "name": "Bubble",
          "domains": ["bubble.io", "run.dev"],
          "selectors": [".bubble-element", "[data-bubble]"],
          "globals": ["bubble_fn", "app"],
          "icon": "🫧",
          "color": "#1F4DFF",
          "capabilities": {
            "workflowOptimization": true,
            "databaseAudit": true,
            "securityCheck": true,
            "performanceAnalysis": true,
            "uiConsistency": true
          },
          "interactions": [
            "## Optimisation workflows Bubble\n\n### Workflow analysis\n- **Infinite loops** detection\n- **Inefficient queries** identification\n- **Privacy rules** validation\n- **API call** optimization\n\n### Corrections automatiques\n- **Workflow restructuring** suggestions\n- **Database query** optimization\n- **Conditional logic** improvement",
            "## Database audit\n\n### Data structure\n- **Normalization** recommendations\n- **Index** suggestions\n- **Relationships** optimization\n\n### Privacy & Security\n- **Privacy rules** comprehensive check\n- **Data exposure** prevention\n- **Field visibility** audit"
          ],
          "prompts": [
            "Auditez cette application Bubble pour optimiser ses performances. Analysez :\n1. **Workflows** inefficaces et boucles\n2. **Requêtes database** lentes\n3. **Privacy rules** manquantes\n4. **API calls** redondants\n5. **Conditional logic** complexe\n\nProposez des améliorations avec étapes précises dans Bubble.",
            "Vérifiez la sécurité de cette app Bubble. Contrôlez :\n1. **Privacy rules** pour chaque data type\n2. **User permissions** et rôles\n3. **API security** et authentification\n4. **Data exposure** potentielle\n5. **Input validation** sur les formulaires\n\nListez les vulnérabilités avec corrections Bubble."
          ]
        }
      ],
      "errorDetection": "## Système de détection d'erreurs\n\n### Types d'erreurs détectées\n1. **Performance issues**\n   - **Slow loading** elements\n   - **Large images** non optimisées\n   - **Blocking scripts**\n   - **Render blocking** CSS\n\n2. **Accessibility problems**\n   - **Missing alt** attributes\n   - **Low contrast** ratios\n   - **Keyboard navigation** issues\n   - **ARIA labels** absents\n\n3. **SEO issues**\n   - **Missing meta** tags\n   - **Duplicate content**\n   - **Broken links**\n   - **Poor heading** structure\n\n4. **Design inconsistencies**\n   - **Typography** variations\n   - **Color** inconsistencies\n   - **Spacing** irregularities\n   - **Component** variations",
      "autoFix": "## Correction automatique\n\n### Workflow auto-fix\n1. **Error detection** sur page load\n2. **AI analysis** des problèmes\n3. **Solution generation** contextuelle\n4. **User confirmation** avant application\n5. **Execution** des corrections\n6. **Validation** post-correction\n\n### Types de corrections\n- **Code injection** pour fixes CSS/JS\n- **Attribute modification** via DOM\n- **Content suggestions** pour SEO\n- **Image optimization** recommendations\n- **Performance improvements** automatically applied",
      "integration": "## Integration avec l'executeur de plans\\n\\n### API Integration\\n```javascript\\nclass PlatformDetector {\\n  async detectPlatform() {\\n    const platform = await this.identifyPlatform();\\n    const issues = await this.scanForIssues(platform);\\n    return { platform, issues };\\n  }\\n\\n  async autoFix(issues) {\\n    for (const issue of issues) {\\n      const prompt = this.generateFixPrompt(issue);\\n      await this.executePlan(prompt);\\n    }\\n  }\\n}\\n```\\n\\n### Prompts generation\\n- Context-aware: Adapte a la plateforme\\n- Issue-specific: Correction ciblee\\n- Step-by-step: Instructions detaillees\\n- Validation: Verification post-fix"
    }
  }
}

CRÉEZ un plan ULTRA-COMPLET avec minimum 15-20 features détaillées et 8-12 pages, chaque feature ayant 3-5 sous-features connectées avec des prompts précis pour l'IA et des spécifications techniques complètes.

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
    const assistantMessage = data.choices?.[0]?.message?.content;
    
    if (!assistantMessage) {
      throw new Error('No response received from OpenAI for plan generation');
    }

    let planData;
    try {
      planData = JSON.parse(assistantMessage);
      // Validation de la structure mindmap
      if (!planData.branches || !planData.centralNode) {
        throw new Error('Structure mindmap invalide');
      }
    } catch (parseError) {
      console.error('Failed to parse OpenAI response as JSON:', parseError);
      // Fallback: create a comprehensive mindmap structure
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
            title: 'Étude de marché & concurrence',
            content: 'Analyse du marché à définir',
            competitors: [
              {
                name: 'Concurrent principal',
                strengths: ['À identifier'],
                weaknesses: ['À analyser'],
                marketShare: 'À estimer',
                pricing: 'À étudier'
              }
            ],
            opportunities: ['À analyser'],
            risks: ['À évaluer'],
            marketSize: 'À définir',
            targetMarket: 'À identifier',
            trends: ['À analyser']
          },
          projectDescription: {
            title: 'Description complète & détaillée',
            summary: prompt,
            objectives: ['Objectif principal à définir'],
            targetAudience: 'Public cible à identifier',
            valueProposition: 'À définir',
            successMetrics: ['À déterminer'],
            businessModel: 'À concevoir'
          },
          technicalDocumentation: {
            title: 'Documentation technique & fonctionnelle',
            modules: [{ 
              name: 'Module principal', 
              description: 'À définir', 
              technologies: ['À déterminer'],
              dependencies: ['À identifier'],
              complexity: 'moyenne'
            }],
            architecture: 'Architecture à concevoir',
            recommendedTools: ['Outils à sélectionner'],
            database: {
              type: 'À définir',
              tables: ['À concevoir'],
              relationships: 'À modéliser'
            },
            apis: [{
              name: 'API principale',
              purpose: 'À définir',
              endpoints: ['À concevoir']
            }],
            security: ['À implémenter'],
            deployment: 'À planifier'
          },
          timeline: {
            title: 'Planning & Roadmap',
            phases: [{
              id: 'phase-1',
              name: 'Phase de développement',
              duration: 'À estimer',
              deliverables: ['À définir'],
              milestones: ['À planifier']
            }],
            criticalPath: ['À identifier'],
            dependencies: ['À analyser']
          },
          team: {
            title: 'Équipe & Ressources',
            roles: [{
              role: 'Développeur',
              skills: ['À définir'],
              timeAllocation: 'À estimer'
            }],
            budget: {
              development: 'À estimer',
              infrastructure: 'À calculer',
              marketing: 'À prévoir',
              total: 'À définir'
            },
            externalServices: ['À sélectionner']
          },
          features: [
            {
              id: 'feature-1',
              title: 'Fonctionnalité principale',
              description: 'Fonctionnalité à développer',
              specifications: 'Spécifications à définir',
              prompt: 'Développez la fonctionnalité principale du projet',
              order: 1,
              priority: 'haute',
              complexity: 'moyenne',
              estimatedTime: 'À estimer',
              dependencies: [],
              acceptanceCriteria: ['À définir'],
              subFeatures: []
            }
          ],
          pages: [
            {
              id: 'page-1',
              title: 'Page d\'accueil',
              content: 'Page principale de l\'application',
              interactions: 'Interactions utilisateur de base',
              components: ['À définir'],
              wireframe: 'À concevoir',
              seo: {
                title: 'À définir',
                description: 'À rédiger',
                keywords: ['À identifier']
              }
            }
          ],
          visualIdentity: {
            colors: {
              primary: ['#3b82f6', '#1d4ed8'],
              secondary: ['#10b981', '#059669'],
              backgrounds: ['#f8fafc', '#ffffff'],
              texts: ['#1f2937', '#374151'],
              accent: ['#f59e0b', '#d97706'],
              error: ['#ef4444', '#dc2626'],
              success: ['#10b981', '#059669'],
              warning: ['#f59e0b', '#d97706']
            },
            icons: ['Icônes modernes', 'Style cohérent'],
            typography: {
              fonts: ['Inter', 'System UI'],
              sizes: ['14px', '16px', '20px', '24px'],
              weights: ['400', '500', '600', '700'],
              lineHeights: ['1.4', '1.5', '1.6']
            },
            styles: {
              borderRadius: '8px pour les éléments, 12px pour les cartes',
              shadows: 'Ombres subtiles avec transparence',
              spacing: 'Espacement cohérent de 4px, 8px, 16px, 24px',
              animations: 'Transitions fluides',
              breakpoints: 'Mobile-first responsive'
            },
            branding: {
              logo: 'À concevoir',
              brandVoice: 'À définir',
              brandValues: ['À identifier']
            }
          },
          testing: {
            title: 'Tests & Qualité',
            unitTests: ['À implémenter'],
            integrationTests: ['À concevoir'],
            e2eTests: ['À planifier'],
            performanceTests: ['À définir'],
            securityTests: ['À mettre en place'],
            accessibilityTests: ['À vérifier']
          },
          deployment: {
            title: 'Déploiement & Maintenance',
            environments: ['développement', 'test', 'production'],
            cicd: 'À configurer',
            monitoring: ['À mettre en place'],
            backups: 'À planifier',
            scaling: 'À prévoir',
            maintenance: ['À organiser']
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