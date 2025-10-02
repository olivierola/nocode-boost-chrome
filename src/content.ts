/// <reference types="chrome"/>
// Content script pour l'extension Chrome
import './types/chrome.d.ts';
import { platformDetector, SUPPORTED_PLATFORMS } from './services/platformDetector';

console.log('Content script chargé');

// Surveiller les événements de copie pour détecter les composants
function setupClipboardMonitoring() {
  document.addEventListener('copy', async (event) => {
    try {
      // Attendre un peu pour que le clipboard soit mis à jour
      setTimeout(async () => {
        try {
          const clipboardText = await navigator.clipboard.readText();
          
          // Vérifier si c'est un composant depuis 21st.dev
          if (window.location.hostname === '21st.dev' || 
              window.location.href.includes('21st.dev')) {
            
            // Détecter si le texte copié ressemble à un composant
            if (clipboardText && (
              clipboardText.includes('import') || 
              clipboardText.includes('export') || 
              clipboardText.includes('function') ||
              clipboardText.includes('const') ||
              (clipboardText.includes('<') && clipboardText.includes('>'))
            )) {
              // Envoyer le composant au background script
              await sendMessageToBackground('saveComponent', {
                content: clipboardText,
                source: '21st.dev',
                url: window.location.href,
                timestamp: new Date().toISOString()
              });
              
              console.log('Composant détecté et sauvegardé:', clipboardText.substring(0, 100) + '...');
            }
          }
        } catch (error) {
          console.log('Erreur lors de la lecture du clipboard:', error);
        }
      }, 100);
    } catch (error) {
      console.log('Erreur lors de la surveillance du clipboard:', error);
    }
  });
}

// Fonction pour communiquer avec le background script
function sendMessageToBackground(action: string, data?: any): Promise<any> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action, data }, (response) => {
      resolve(response);
    });
  });
}

// Fonction pour injecter du CSS personnalisé si nécessaire
function injectCustomStyles() {
  const style = document.createElement('style');
  style.textContent = `
    /* Styles personnalisés pour l'extension si nécessaire */
    .extension-highlight {
      border: 2px solid #3b82f6 !important;
      background-color: rgba(59, 130, 246, 0.1) !important;
    }
  `;
  document.head.appendChild(style);
}

// Fonction pour détecter et analyser le contenu de la page
async function analyzePageContent() {
  // Détection de la plateforme no-code
  const detectedPlatform = await platformDetector.detectPlatform();
  let platformIssues: any[] = [];
  
  if (detectedPlatform) {
    console.log(`Plateforme détectée: ${detectedPlatform.name}`);
    platformIssues = await platformDetector.scanForIssues(detectedPlatform);
  }

  const pageData = {
    url: window.location.href,
    title: document.title,
    description: document.querySelector('meta[name="description"]')?.getAttribute('content') || '',
    headings: Array.from(document.querySelectorAll('h1, h2, h3')).map(h => h.textContent?.trim() || ''),
    links: Array.from(document.querySelectorAll('a[href]')).slice(0, 10).map(a => ({
      text: a.textContent?.trim() || '',
      href: a.getAttribute('href') || ''
    })),
    platform: detectedPlatform ? {
      name: detectedPlatform.name,
      icon: detectedPlatform.icon,
      color: detectedPlatform.color,
      capabilities: detectedPlatform.capabilities,
      issues: platformIssues
    } : null,
    timestamp: new Date().toISOString()
  };
  
  return pageData;
}

// Initialisation du content script
async function initContentScript() {
  console.log('Initialisation du content script');
  
  // Analyser le contenu de la page
  const pageData = await analyzePageContent();
  console.log('Données de la page:', pageData);
  
  // Sauvegarder les données dans le storage
  sendMessageToBackground('saveExtensionData', { 
    lastPageAnalyzed: pageData 
  });
  
  // Injecter les styles personnalisés
  injectCustomStyles();
  
  // Activer la surveillance du clipboard
  setupClipboardMonitoring();
  
  // Créer le bouton flottant adapté à la plateforme
  createFloatingButton(pageData.platform);
}

// Créer un bouton flottant adapté à la plateforme détectée
function createFloatingButton(platform: any) {
  // Supprimer le bouton existant s'il y en a un
  const existingButton = document.querySelector('#ai-assistant-floating-btn');
  if (existingButton) {
    existingButton.remove();
  }

  const button = document.createElement('div');
  button.id = 'ai-assistant-floating-btn';
  button.innerHTML = platform ? platform.icon : '🤖';
  
  // Styles du bouton flottant
  Object.assign(button.style, {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    backgroundColor: platform ? platform.color : '#3b82f6',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    zIndex: '9999',
    transition: 'all 0.3s ease',
    border: '2px solid white'
  });

  // Effet hover
  button.addEventListener('mouseenter', () => {
    button.style.transform = 'scale(1.1)';
    button.style.boxShadow = '0 6px 20px rgba(0,0,0,0.25)';
  });

  button.addEventListener('mouseleave', () => {
    button.style.transform = 'scale(1)';
    button.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
  });

  // Action au clic
  button.addEventListener('click', () => {
    if (platform && platform.issues && platform.issues.length > 0) {
      showIssuesModal(platform);
    } else {
      // Ouvrir l'extension normale
      sendMessageToBackground('openExtension');
    }
  });

  document.body.appendChild(button);
}

// Afficher une modal avec les problèmes détectés
function showIssuesModal(platform: any) {
  const modal = document.createElement('div');
  modal.id = 'ai-issues-modal';
  
  const modalContent = `
    <div style="
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <div style="
        background: white;
        padding: 24px;
        border-radius: 12px;
        max-width: 500px;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 20px 40px rgba(0,0,0,0.3);
      ">
        <div style="display: flex; align-items: center; margin-bottom: 16px;">
          <span style="font-size: 24px; margin-right: 8px;">${platform.icon}</span>
          <h3 style="margin: 0; color: ${platform.color};">${platform.name} - Issues détectés</h3>
          <button id="close-modal" style="
            margin-left: auto;
            background: none;
            border: none;
            font-size: 20px;
            cursor: pointer;
            color: #666;
          ">×</button>
        </div>
        
        <div style="margin-bottom: 16px;">
          <p style="color: #666; margin: 0;">
            ${platform.issues.length} problème(s) détecté(s) sur cette page ${platform.name}.
          </p>
        </div>
        
        <div style="space-y: 12px;">
          ${platform.issues.map((issue: any, index: number) => `
            <div style="
              border: 1px solid #e5e7eb;
              border-radius: 8px;
              padding: 12px;
              margin-bottom: 8px;
            ">
              <div style="display: flex; align-items: center; margin-bottom: 8px;">
                <span style="
                  background: ${issue.severity === 'high' ? '#ef4444' : issue.severity === 'medium' ? '#f59e0b' : '#10b981'};
                  color: white;
                  padding: 2px 8px;
                  border-radius: 4px;
                  font-size: 12px;
                  font-weight: bold;
                  margin-right: 8px;
                ">${issue.severity.toUpperCase()}</span>
                <h4 style="margin: 0; font-size: 14px;">${issue.title}</h4>
              </div>
              <p style="margin: 0; font-size: 12px; color: #666;">${issue.description}</p>
              <button 
                class="fix-issue-btn" 
                data-issue-index="${index}"
                style="
                  background: ${platform.color};
                  color: white;
                  border: none;
                  padding: 6px 12px;
                  border-radius: 4px;
                  font-size: 12px;
                  cursor: pointer;
                  margin-top: 8px;
                "
              >
                Corriger automatiquement
              </button>
            </div>
          `).join('')}
        </div>
        
        <div style="margin-top: 16px; text-align: center;">
          <button id="fix-all-issues" style="
            background: ${platform.color};
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-weight: bold;
            cursor: pointer;
          ">
            Corriger tous les problèmes
          </button>
        </div>
      </div>
    </div>
  `;
  
  modal.innerHTML = modalContent;
  document.body.appendChild(modal);
  
  // Event listeners
  modal.querySelector('#close-modal')?.addEventListener('click', () => {
    modal.remove();
  });
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal.firstElementChild) {
      modal.remove();
    }
  });
  
  // Boutons de correction individuelle
  modal.querySelectorAll('.fix-issue-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const issueIndex = parseInt((e.target as HTMLElement).dataset.issueIndex!);
      fixSingleIssue(platform, platform.issues[issueIndex]);
    });
  });
  
  // Bouton corriger tout
  modal.querySelector('#fix-all-issues')?.addEventListener('click', () => {
    fixAllIssues(platform);
    modal.remove();
  });
}

// Corriger un problème spécifique
async function fixSingleIssue(platform: any, issue: any) {
  console.log(`Correction de: ${issue.title}`);
  
  const prompt = platformDetector.generateFixPrompt(issue, platform);
  
  // Envoyer le prompt à l'exécuteur de plan
  sendMessageToBackground('executeAutoFix', {
    prompt,
    issue,
    platform: platform.name
  });
}

// Corriger tous les problèmes
async function fixAllIssues(platform: any) {
  console.log(`Correction de tous les problèmes ${platform.name}`);
  
  for (const issue of platform.issues) {
    await fixSingleIssue(platform, issue);
  }
}

// Attendre que le DOM soit prêt
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initContentScript);
} else {
  initContentScript();
}

// Écouter les messages du popup ou background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message reçu dans content script:', request);
  
  switch (request.action) {
    case 'getPageData':
      analyzePageContent().then(pageData => {
        sendResponse({ success: true, data: pageData });
      });
      return true; // Indique que la réponse sera asynchrone
      
    case 'highlightElements':
      // Mettre en surbrillance certains éléments
      const elements = document.querySelectorAll(request.selector || 'h1, h2, h3');
      elements.forEach(el => el.classList.add('extension-highlight'));
      sendResponse({ success: true, count: elements.length });
      break;
      
    case 'removeHighlight':
      // Supprimer la surbrillance
      const highlighted = document.querySelectorAll('.extension-highlight');
      highlighted.forEach(el => el.classList.remove('extension-highlight'));
      sendResponse({ success: true, count: highlighted.length });
      break;
      
    case 'detectPlatform':
      platformDetector.detectPlatform().then(detectedPlatform => {
        sendResponse({ success: true, platform: detectedPlatform });
      });
      return true;
      
    case 'scanIssues':
      if (request.platform) {
        platformDetector.scanForIssues(request.platform).then(issues => {
          sendResponse({ success: true, issues });
        });
        return true;
      } else {
        sendResponse({ success: false, error: 'Plateforme non fournie' });
      }
      break;
      
    case 'clickElement':
      // Agent interaction with DOM - Click on an element
      try {
        const element = document.querySelector(request.selector);
        if (element && element instanceof HTMLElement) {
          element.click();
          console.log('Element clicked by agent:', request.selector);
          sendResponse({ success: true });
        } else {
          sendResponse({ success: false, error: 'Element not found' });
        }
      } catch (error) {
        sendResponse({ success: false, error: String(error) });
      }
      break;
      
    case 'getElementText':
      // Get text content of an element
      try {
        const element = document.querySelector(request.selector);
        if (element) {
          sendResponse({ success: true, text: element.textContent });
        } else {
          sendResponse({ success: false, error: 'Element not found' });
        }
      } catch (error) {
        sendResponse({ success: false, error: String(error) });
      }
      break;
      
    case 'fillInput':
      // Fill an input field
      try {
        const element = document.querySelector(request.selector);
        if (element && (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)) {
          element.value = request.value;
          element.dispatchEvent(new Event('input', { bubbles: true }));
          element.dispatchEvent(new Event('change', { bubbles: true }));
          console.log('Input filled by agent:', request.selector);
          sendResponse({ success: true });
        } else {
          sendResponse({ success: false, error: 'Input element not found' });
        }
      } catch (error) {
        sendResponse({ success: false, error: String(error) });
      }
      break;
      
    default:
      sendResponse({ success: false, error: 'Action non reconnue' });
  }
});

export {};