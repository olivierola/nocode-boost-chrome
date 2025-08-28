/// <reference types="chrome"/>
// Content script pour l'extension Chrome
import './types/chrome.d.ts';
console.log('Content script chargé');

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
function analyzePageContent() {
  const pageData = {
    url: window.location.href,
    title: document.title,
    description: document.querySelector('meta[name="description"]')?.getAttribute('content') || '',
    headings: Array.from(document.querySelectorAll('h1, h2, h3')).map(h => h.textContent?.trim() || ''),
    links: Array.from(document.querySelectorAll('a[href]')).slice(0, 10).map(a => ({
      text: a.textContent?.trim() || '',
      href: a.getAttribute('href') || ''
    })),
    timestamp: new Date().toISOString()
  };
  
  return pageData;
}

// Initialisation du content script
function initContentScript() {
  console.log('Initialisation du content script');
  
  // Analyser le contenu de la page
  const pageData = analyzePageContent();
  console.log('Données de la page:', pageData);
  
  // Sauvegarder les données dans le storage
  sendMessageToBackground('saveExtensionData', { 
    lastPageAnalyzed: pageData 
  });
  
  // Injecter les styles personnalisés
  injectCustomStyles();
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
      const pageData = analyzePageContent();
      sendResponse({ success: true, data: pageData });
      break;
      
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
      
    default:
      sendResponse({ success: false, error: 'Action non reconnue' });
  }
});

export {};