// Service de détection des plateformes no-code
export interface NoCodePlatform {
  name: string;
  domains: string[];
  selectors: string[];
  globals: string[];
  icon: string;
  color: string;
  capabilities: {
    errorDetection?: boolean;
    performanceAnalysis?: boolean;
    seoAudit?: boolean;
    accessibilityCheck?: boolean;
    designConsistency?: boolean;
    workflowOptimization?: boolean;
    databaseAudit?: boolean;
    securityCheck?: boolean;
    uiConsistency?: boolean;
  };
  interactions: string[];
  prompts: string[];
}

export const SUPPORTED_PLATFORMS: NoCodePlatform[] = [
  {
    name: "Webflow",
    domains: ["webflow.com", "webflow.io"],
    selectors: [".w-webflow-badge", "[data-wf-page]", ".w-form"],
    globals: ["Webflow", "_wf_refresh"],
    icon: "🌊",
    color: "#4353FF",
    capabilities: {
      errorDetection: true,
      performanceAnalysis: true,
      seoAudit: true,
      accessibilityCheck: true,
      designConsistency: true
    },
    interactions: [
      "Détection d'erreurs communes (alt tags manquants, liens cassés, problèmes responsive)",
      "Optimisation des performances (images, CSS inutilisé, scripts bloquants)",
      "Audit SEO complet avec recommandations",
      "Vérification de l'accessibilité WCAG 2.1"
    ],
    prompts: [
      "Analysez cette page Webflow et identifiez tous les problèmes d'accessibilité. Pour chaque problème trouvé, proposez une correction spécifique avec le code exact à implémenter dans Webflow.",
      "Optimisez les performances de cette page Webflow. Analysez les images non optimisées, CSS inutilisé, JavaScript bloquant, et proposez des corrections avec instructions Webflow précises."
    ]
  },
  {
    name: "Bubble",
    domains: ["bubble.io", "run.dev"],
    selectors: [".bubble-element", "[data-bubble]"],
    globals: ["bubble_fn", "app"],
    icon: "🫧",
    color: "#1F4DFF",
    capabilities: {
      workflowOptimization: true,
      databaseAudit: true,
      securityCheck: true,
      performanceAnalysis: true,
      uiConsistency: true
    },
    interactions: [
      "Optimisation des workflows (détection de boucles infinies, requêtes inefficaces)",
      "Audit de la base de données (normalisation, index, relations)",
      "Vérification des règles de confidentialité et sécurité",
      "Analyse des performances et optimisations"
    ],
    prompts: [
      "Auditez cette application Bubble pour optimiser ses performances. Analysez les workflows inefficaces, requêtes database lentes, privacy rules manquantes, et proposez des améliorations avec étapes précises dans Bubble.",
      "Vérifiez la sécurité de cette app Bubble. Contrôlez les privacy rules pour chaque data type, user permissions, API security, et listez les vulnérabilités avec corrections Bubble."
    ]
  },
  {
    name: "Framer",
    domains: ["framer.com", "framer.website"],
    selectors: ["[data-framer-component]", ".framer-"],
    globals: ["Framer", "__framer"],
    icon: "🎨",
    color: "#0066FF",
    capabilities: {
      performanceAnalysis: true,
      seoAudit: true,
      designConsistency: true,
      accessibilityCheck: true
    },
    interactions: [
      "Optimisation des animations et performances",
      "Audit SEO pour sites statiques",
      "Vérification de la cohérence du design system",
      "Tests d'accessibilité des interactions"
    ],
    prompts: [
      "Optimisez les performances de cette page Framer. Analysez les animations lourdes, images non optimisées, et proposez des améliorations de performance.",
      "Auditez le design system de ce site Framer. Vérifiez la cohérence des couleurs, typographie, espacements, et proposez des standardisations."
    ]
  },
  {
    name: "Notion",
    domains: ["notion.so", "notion.site"],
    selectors: [".notion-page", "[data-block-id]"],
    globals: ["notion"],
    icon: "📝",
    color: "#000000",
    capabilities: {
      seoAudit: true,
      accessibilityCheck: true,
      designConsistency: true
    },
    interactions: [
      "Optimisation SEO pour pages publiques",
      "Amélioration de l'accessibilité du contenu",
      "Suggestions de structure et navigation"
    ],
    prompts: [
      "Optimisez cette page Notion publique pour le SEO. Analysez la structure des titres, meta descriptions, contenu, et proposez des améliorations.",
      "Améliorez l'accessibilité de cette page Notion. Vérifiez la hiérarchie des titres, contrastes, et proposez des optimisations."
    ]
  }
];

export class PlatformDetector {
  private detectedPlatform: NoCodePlatform | null = null;

  async detectPlatform(): Promise<NoCodePlatform | null> {
    // Détection basée sur l'URL
    const currentDomain = window.location.hostname;
    
    for (const platform of SUPPORTED_PLATFORMS) {
      // Vérification du domaine
      const domainMatch = platform.domains.some(domain => 
        currentDomain.includes(domain)
      );

      if (domainMatch) {
        // Vérification supplémentaire avec les sélecteurs CSS
        const selectorMatch = platform.selectors.some(selector => 
          document.querySelector(selector) !== null
        );

        // Vérification des variables globales
        const globalMatch = platform.globals.some(global => 
          (window as any)[global] !== undefined
        );

        if (selectorMatch || globalMatch) {
          this.detectedPlatform = platform;
          return platform;
        }
      }
    }

    return null;
  }

  // Nouvelles méthodes pour l'intégration frontend
  detectAITextFields(): NodeListOf<Element> {
    const selectors = [
      'textarea[placeholder*="prompt"]',
      'textarea[placeholder*="message"]', 
      'input[placeholder*="ask"]',
      'div[contenteditable="true"]',
      '[role="textbox"]',
      '.chat-input',
      '.prompt-input',
      '.ai-input'
    ];
    
    return document.querySelectorAll(selectors.join(', '));
  }

  detectSendButtons(): NodeListOf<Element> {
    const selectors = [
      'button[type="submit"]',
      'button:has(svg[data-icon="send"])',
      'button:has(svg[data-icon="arrow-right"])',
      '.send-button',
      '.submit-button',
      '[aria-label*="send"]',
      '[aria-label*="submit"]'
    ];
    
    return document.querySelectorAll(selectors.join(', '));
  }

  detectResponseElements(): NodeListOf<Element> {
    const selectors = [
      '.message',
      '.response',
      '.ai-message',
      '.chat-message',
      '[role="log"]',
      '[data-message-id]'
    ];
    
    return document.querySelectorAll(selectors.join(', '));
  }

  interceptPrompts(onInterceptCallback: (prompt: string, element: Element) => void): void {
    const textFields = this.detectAITextFields();
    const sendButtons = this.detectSendButtons();

    // Intercepter les soumissions de formulaires
    sendButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        e.preventDefault();
        const form = button.closest('form');
        const textField = form?.querySelector('textarea, input[type="text"]') as HTMLInputElement;
        
        if (textField && textField.value.trim()) {
          onInterceptCallback(textField.value, textField);
        }
      });
    });

    // Intercepter les touches Enter
    textFields.forEach(field => {
      field.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          const value = (field as HTMLInputElement).value || (field as HTMLElement).textContent;
          if (value?.trim()) {
            onInterceptCallback(value, field);
          }
        }
      });
    });
  }

  detectErrorMessages(): boolean {
    const errorSelectors = [
      '.error',
      '.error-message',
      '[role="alert"]',
      '.alert-error',
      '.text-red',
      '.text-danger',
      '.notification-error'
    ];

    const errorKeywords = [
      'error',
      'erreur',
      'failed',
      'échoué',
      'invalid',
      'invalide',
      'timeout',
      'limit',
      'limite'
    ];

    // Vérifier les éléments avec classes d'erreur
    const errorElements = document.querySelectorAll(errorSelectors.join(', '));
    if (errorElements.length > 0) return true;

    // Vérifier le contenu pour des mots-clés d'erreur
    const allText = document.body.textContent?.toLowerCase() || '';
    return errorKeywords.some(keyword => allText.includes(keyword));
  }

  async scanForIssues(platform: NoCodePlatform): Promise<any[]> {
    const issues: any[] = [];

    if (platform.capabilities.accessibilityCheck) {
      issues.push(...await this.checkAccessibility());
    }

    if (platform.capabilities.performanceAnalysis) {
      issues.push(...await this.analyzePerformance());
    }

    if (platform.capabilities.seoAudit) {
      issues.push(...await this.auditSEO());
    }

    if (platform.capabilities.designConsistency) {
      issues.push(...await this.checkDesignConsistency());
    }

    return issues;
  }

  private async checkAccessibility(): Promise<any[]> {
    const issues: any[] = [];

    // Vérification des images sans alt
    const imagesWithoutAlt = document.querySelectorAll('img:not([alt])');
    if (imagesWithoutAlt.length > 0) {
      issues.push({
        type: 'accessibility',
        severity: 'high',
        title: 'Images sans attribut alt',
        description: `${imagesWithoutAlt.length} images n'ont pas d'attribut alt`,
        elements: Array.from(imagesWithoutAlt),
        fix: 'Ajouter des attributs alt descriptifs à toutes les images'
      });
    }

    // Vérification des liens sans texte
    const emptyLinks = document.querySelectorAll('a:empty, a[aria-label=""]');
    if (emptyLinks.length > 0) {
      issues.push({
        type: 'accessibility',
        severity: 'medium',
        title: 'Liens sans texte descriptif',
        description: `${emptyLinks.length} liens n'ont pas de texte ou d'aria-label`,
        elements: Array.from(emptyLinks),
        fix: 'Ajouter du texte descriptif ou des aria-label aux liens'
      });
    }

    // Vérification de la hiérarchie des titres
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    if (headings.length > 0) {
      const headingLevels = Array.from(headings).map(h => parseInt(h.tagName.charAt(1)));
      let previousLevel = 0;
      let hasIssue = false;

      for (const level of headingLevels) {
        if (level > previousLevel + 1) {
          hasIssue = true;
          break;
        }
        previousLevel = level;
      }

      if (hasIssue) {
        issues.push({
          type: 'accessibility',
          severity: 'medium',
          title: 'Hiérarchie des titres incorrecte',
          description: 'La hiérarchie des titres H1-H6 présente des sauts de niveau',
          elements: Array.from(headings),
          fix: 'Respecter l\'ordre hiérarchique des titres (H1 > H2 > H3...)'
        });
      }
    }

    return issues;
  }

  private async analyzePerformance(): Promise<any[]> {
    const issues: any[] = [];

    // Vérification des images lourdes
    const largeImages = document.querySelectorAll('img');
    const heavyImages: Element[] = [];

    largeImages.forEach(img => {
      const src = img.getAttribute('src');
      if (src && !src.includes('webp') && !img.hasAttribute('loading')) {
        heavyImages.push(img);
      }
    });

    if (heavyImages.length > 0) {
      issues.push({
        type: 'performance',
        severity: 'medium',
        title: 'Images non optimisées',
        description: `${heavyImages.length} images pourraient être optimisées`,
        elements: heavyImages,
        fix: 'Convertir en WebP et ajouter lazy loading'
      });
    }

    // Vérification des scripts bloquants
    const blockingScripts = document.querySelectorAll('script:not([async]):not([defer])');
    if (blockingScripts.length > 3) {
      issues.push({
        type: 'performance',
        severity: 'high',
        title: 'Scripts bloquants détectés',
        description: `${blockingScripts.length} scripts bloquent le rendu`,
        elements: Array.from(blockingScripts),
        fix: 'Ajouter async ou defer aux scripts non critiques'
      });
    }

    return issues;
  }

  private async auditSEO(): Promise<any[]> {
    const issues: any[] = [];

    // Vérification du titre
    const title = document.querySelector('title');
    if (!title || title.textContent!.length < 30 || title.textContent!.length > 60) {
      issues.push({
        type: 'seo',
        severity: 'high',
        title: 'Titre de page problématique',
        description: 'Le titre doit faire entre 30 et 60 caractères',
        elements: title ? [title] : [],
        fix: 'Optimiser le titre entre 30-60 caractères avec mot-clé principal'
      });
    }

    // Vérification de la meta description
    const metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc || metaDesc.getAttribute('content')!.length < 120) {
      issues.push({
        type: 'seo',
        severity: 'high',
        title: 'Meta description manquante ou trop courte',
        description: 'La meta description doit faire 120-160 caractères',
        elements: metaDesc ? [metaDesc] : [],
        fix: 'Ajouter une meta description de 120-160 caractères'
      });
    }

    // Vérification des H1
    const h1s = document.querySelectorAll('h1');
    if (h1s.length === 0) {
      issues.push({
        type: 'seo',
        severity: 'high',
        title: 'Aucun titre H1 trouvé',
        description: 'Chaque page doit avoir un titre H1 unique',
        elements: [],
        fix: 'Ajouter un titre H1 avec le mot-clé principal'
      });
    } else if (h1s.length > 1) {
      issues.push({
        type: 'seo',
        severity: 'medium',
        title: 'Plusieurs titres H1 détectés',
        description: 'Une seule balise H1 par page est recommandée',
        elements: Array.from(h1s),
        fix: 'Garder un seul H1, convertir les autres en H2'
      });
    }

    return issues;
  }

  private async checkDesignConsistency(): Promise<any[]> {
    const issues: any[] = [];

    // Vérification des couleurs
    const allElements = document.querySelectorAll('*');
    const colors = new Set<string>();
    
    allElements.forEach(el => {
      const style = window.getComputedStyle(el);
      if (style.color && style.color !== 'rgba(0, 0, 0, 0)') {
        colors.add(style.color);
      }
      if (style.backgroundColor && style.backgroundColor !== 'rgba(0, 0, 0, 0)') {
        colors.add(style.backgroundColor);
      }
    });

    if (colors.size > 20) {
      issues.push({
        type: 'design',
        severity: 'medium',
        title: 'Trop de couleurs différentes',
        description: `${colors.size} couleurs différentes utilisées`,
        elements: [],
        fix: 'Limiter à une palette de 8-12 couleurs maximum'
      });
    }

    // Vérification des polices
    const fonts = new Set<string>();
    allElements.forEach(el => {
      const style = window.getComputedStyle(el);
      if (style.fontFamily) {
        fonts.add(style.fontFamily);
      }
    });

    if (fonts.size > 4) {
      issues.push({
        type: 'design',
        severity: 'low',
        title: 'Trop de polices différentes',
        description: `${fonts.size} polices différentes utilisées`,
        elements: [],
        fix: 'Limiter à 2-3 polices maximum'
      });
    }

    return issues;
  }

  generateFixPrompt(issue: any, platform: NoCodePlatform): string {
    const baseContext = `Vous êtes un expert en ${platform.name}. `;
    
    switch (issue.type) {
      case 'accessibility':
        return `${baseContext}Corrigez ce problème d'accessibilité : "${issue.title}". 
        Description : ${issue.description}
        
        Fournissez des instructions étape par étape spécifiques à ${platform.name} pour résoudre ce problème.
        Incluez le code exact à utiliser si applicable.`;

      case 'performance':
        return `${baseContext}Optimisez les performances : "${issue.title}".
        Description : ${issue.description}
        
        Proposez des solutions concrètes avec les réglages spécifiques à ${platform.name}.
        Incluez les paramètres d'optimisation recommandés.`;

      case 'seo':
        return `${baseContext}Améliorez le SEO : "${issue.title}".
        Description : ${issue.description}
        
        Donnez les instructions précises pour optimiser cet aspect dans ${platform.name}.
        Incluez les meilleures pratiques et le contenu suggéré.`;

      case 'design':
        return `${baseContext}Corrigez la cohérence design : "${issue.title}".
        Description : ${issue.description}
        
        Proposez un design system cohérent avec les outils ${platform.name}.
        Incluez les valeurs exactes à utiliser (couleurs, polices, espacements).`;

      default:
        return `${baseContext}Résolvez ce problème : "${issue.title}". 
        Description : ${issue.description}
        
        Fournissez une solution détaillée adaptée à ${platform.name}.`;
    }
  }

  getDetectedPlatform(): NoCodePlatform | null {
    return this.detectedPlatform;
  }
}

export const platformDetector = new PlatformDetector();