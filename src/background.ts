/// <reference types="chrome"/>
// Background script pour l'extension Chrome
import './types/chrome.d.ts';
console.log('Background script démarré');

// Installation de l'extension
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Extension installée:', details.reason);
  
  if (details.reason === 'install') {
    // Actions à effectuer lors de la première installation
    chrome.storage.local.set({
      extensionInstalled: true,
      installDate: new Date().toISOString()
    });
  }
});

// Gestion des messages depuis le content script ou popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message reçu:', request);
  
  switch (request.action) {
    case 'getExtensionData':
      chrome.storage.local.get(null, (data) => {
        sendResponse({ success: true, data });
      });
      return true; // Indique que la réponse sera asynchrone
      
    case 'saveExtensionData':
      chrome.storage.local.set(request.data, () => {
        sendResponse({ success: true });
      });
      return true;
      
    case 'openPopup':
      // Ouvrir le popup (déjà géré par l'action par défaut)
      sendResponse({ success: true });
      break;
      
    default:
      sendResponse({ success: false, error: 'Action non reconnue' });
  }
});

// Gestion des clics sur l'icône de l'extension
chrome.action.onClicked.addListener((tab) => {
  console.log('Icône de l\'extension cliquée:', tab.url);
});

// Gestion des changements d'onglets
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    console.log('Page chargée:', tab.url);
  }
});

export {};