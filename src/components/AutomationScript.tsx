import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Play, 
  Download, 
  Upload, 
  Settings, 
  Bot, 
  MessageSquare,
  Code,
  Zap
} from 'lucide-react';

interface PlatformConfig {
  name: string;
  domain: string;
  chatSelector: string;
  submitSelector: string;
  responseSelector: string;
  inputSelector: string;
}

interface AutomationResponse {
  id: string;
  platform: string;
  prompt: string;
  response: string;
  timestamp: Date;
  status: 'pending' | 'completed' | 'error';
}

const SUPPORTED_PLATFORMS: PlatformConfig[] = [
  {
    name: 'Bolt.new',
    domain: 'bolt.new',
    chatSelector: '[data-testid="chat-input"]',
    submitSelector: '[data-testid="send-button"]',
    responseSelector: '.message-content',
    inputSelector: 'textarea[placeholder*="prompt"]'
  },
  {
    name: 'Replit Agent',
    domain: 'replit.com',
    chatSelector: '.cm-editor',
    submitSelector: '[aria-label="Send"]',
    responseSelector: '.message',
    inputSelector: 'textarea'
  },
  {
    name: 'V0.dev',
    domain: 'v0.dev',
    chatSelector: 'textarea[placeholder*="Describe"]',
    submitSelector: 'button[type="submit"]',
    responseSelector: '.prose',
    inputSelector: 'textarea'
  },
  {
    name: 'Claude.ai',
    domain: 'claude.ai',
    chatSelector: '[data-testid="chat-input"]',
    submitSelector: '[data-testid="send-button"]',
    responseSelector: '[data-testid="message"]',
    inputSelector: 'div[contenteditable="true"]'
  },
  {
    name: 'ChatGPT',
    domain: 'chat.openai.com',
    chatSelector: '#prompt-textarea',
    submitSelector: '[data-testid="send-button"]',
    responseSelector: '[data-message-author-role="assistant"]',
    inputSelector: '#prompt-textarea'
  }
];

export const AutomationScript = () => {
  const { toast } = useToast();
  const [isActive, setIsActive] = useState(false);
  const [currentPlatform, setCurrentPlatform] = useState<string>('');
  const [predefinedPrompts, setPredefinedPrompts] = useState<string[]>([
    'Crée une landing page moderne avec un design épuré',
    'Développe un dashboard administrateur avec des graphiques',
    'Génère un système d\'authentification complet',
    'Crée une API REST avec documentation Swagger'
  ]);
  const [newPrompt, setNewPrompt] = useState('');
  const [responses, setResponses] = useState<AutomationResponse[]>([]);
  const [isInjecting, setIsInjecting] = useState(false);
  const [autoMode, setAutoMode] = useState(false);

  // Génération du script d'injection
  const generateInjectionScript = () => {
    return `
(function() {
  const PLATFORMS = ${JSON.stringify(SUPPORTED_PLATFORMS)};
  
  // Détection de la plateforme actuelle
  function detectPlatform() {
    const hostname = window.location.hostname;
    return PLATFORMS.find(p => hostname.includes(p.domain));
  }
  
  // Injection de prompt
  function injectPrompt(prompt, platform) {
    const inputElement = document.querySelector(platform.inputSelector) || 
                        document.querySelector(platform.chatSelector);
    
    if (inputElement) {
      // Pour les textarea normales
      if (inputElement.tagName === 'TEXTAREA') {
        inputElement.value = prompt;
        inputElement.dispatchEvent(new Event('input', { bubbles: true }));
      }
      // Pour les div contenteditable
      else if (inputElement.contentEditable === 'true') {
        inputElement.textContent = prompt;
        inputElement.dispatchEvent(new Event('input', { bubbles: true }));
      }
      // Pour les éditeurs de code
      else {
        inputElement.innerText = prompt;
        inputElement.dispatchEvent(new Event('input', { bubbles: true }));
      }
      
      return true;
    }
    return false;
  }
  
  // Soumission automatique
  function submitPrompt(platform) {
    const submitButton = document.querySelector(platform.submitSelector);
    if (submitButton && !submitButton.disabled) {
      submitButton.click();
      return true;
    }
    return false;
  }
  
  // Récupération de la réponse
  function waitForResponse(platform, callback) {
    let attempts = 0;
    const maxAttempts = 60; // 1 minute
    
    const checkResponse = () => {
      attempts++;
      const responseElements = document.querySelectorAll(platform.responseSelector);
      const lastResponse = responseElements[responseElements.length - 1];
      
      if (lastResponse && lastResponse.textContent.trim()) {
        callback({
          success: true,
          response: lastResponse.textContent.trim(),
          html: lastResponse.innerHTML
        });
      } else if (attempts < maxAttempts) {
        setTimeout(checkResponse, 1000);
      } else {
        callback({
          success: false,
          error: 'Timeout: Aucune réponse détectée'
        });
      }
    };
    
    setTimeout(checkResponse, 2000); // Attendre 2s avant de commencer à vérifier
  }
  
  // Interface de communication avec l'extension
  window.automationScript = {
    detectPlatform,
    injectPrompt,
    submitPrompt,
    waitForResponse,
    
    // Fonction principale d'automatisation
    automate: function(prompt, callback) {
      const platform = detectPlatform();
      if (!platform) {
        callback({ success: false, error: 'Plateforme non supportée' });
        return;
      }
      
      // 1. Injection du prompt
      if (!injectPrompt(prompt, platform)) {
        callback({ success: false, error: 'Impossible d\\'injecter le prompt' });
        return;
      }
      
      // 2. Soumission
      setTimeout(() => {
        if (!submitPrompt(platform)) {
          callback({ success: false, error: 'Impossible de soumettre le prompt' });
          return;
        }
        
        // 3. Attente de la réponse
        waitForResponse(platform, callback);
      }, 1000);
    }
  };
  
  // Injection de la sidebar
  function createSidebar() {
    if (document.getElementById('automation-sidebar')) return;
    
    const sidebar = document.createElement('div');
    sidebar.id = 'automation-sidebar';
    sidebar.style.cssText = \`
      position: fixed;
      top: 0;
      left: 0;
      width: 400px;
      height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      box-shadow: 2px 0 10px rgba(0,0,0,0.3);
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      overflow-y: auto;
      transform: translateX(-100%);
      transition: transform 0.3s ease;
    \`;
    
    sidebar.innerHTML = \`
      <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 20px;">
        <h3 style="margin: 0; font-size: 18px;">🤖 Automation Script</h3>
        <button onclick="this.parentElement.parentElement.style.transform='translateX(-100%)'" 
                style="background: rgba(255,255,255,0.2); border: none; color: white; padding: 5px 10px; border-radius: 5px; cursor: pointer;">
          ✕
        </button>
      </div>
      <div id="automation-content">
        <p style="margin: 10px 0; font-size: 14px; opacity: 0.9;">
          Plateforme détectée: <strong>\${platform ? platform.name : 'Non supportée'}</strong>
        </p>
        <div id="automation-responses" style="max-height: 400px; overflow-y: auto; margin-top: 20px;">
          <!-- Les réponses s'afficheront ici -->
        </div>
      </div>
    \`;
    
    document.body.appendChild(sidebar);
    
    // Afficher la sidebar
    setTimeout(() => {
      sidebar.style.transform = 'translateX(0)';
    }, 100);
  }
  
  // Ajout d'un bouton flottant pour ouvrir la sidebar
  function createFloatingButton() {
    if (document.getElementById('automation-toggle')) return;
    
    const button = document.createElement('button');
    button.id = 'automation-toggle';
    button.innerHTML = '🤖';
    button.style.cssText = \`
      position: fixed;
      top: 20px;
      left: 20px;
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      font-size: 20px;
      cursor: pointer;
      z-index: 9999;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      transition: transform 0.2s ease;
    \`;
    
    button.onmouseover = () => button.style.transform = 'scale(1.1)';
    button.onmouseout = () => button.style.transform = 'scale(1)';
    button.onclick = () => {
      const sidebar = document.getElementById('automation-sidebar');
      if (sidebar) {
        sidebar.style.transform = sidebar.style.transform === 'translateX(0px)' ? 
          'translateX(-100%)' : 'translateX(0)';
      } else {
        createSidebar();
      }
    };
    
    document.body.appendChild(button);
  }
  
  // Initialisation
  createFloatingButton();
  console.log('🤖 Automation Script chargé! Plateforme:', detectPlatform()?.name || 'Non supportée');
})();
`;
  };

  // Injection du script dans l'onglet actuel
  const injectScript = async () => {
    const script = generateInjectionScript();
    
    try {
      // Pour une extension Chrome
      if (typeof chrome !== 'undefined' && chrome.tabs) {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: function(scriptCode) {
            eval(scriptCode);
          },
          args: [script]
        });
      } else {
        // Fallback: copier dans le presse-papiers
        await navigator.clipboard.writeText(script);
        toast({
          title: "Script copié",
          description: "Collez le script dans la console de votre navigateur",
        });
      }
      
      setIsActive(true);
      toast({
        title: "Script injecté",
        description: "L'automation est maintenant active",
      });
    } catch (error) {
      console.error('Erreur injection:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'injecter le script",
        variant: "destructive",
      });
    }
  };

  // Ajout d'un prompt prédéfini
  const addPredefinedPrompt = () => {
    if (newPrompt.trim()) {
      setPredefinedPrompts([...predefinedPrompts, newPrompt]);
      setNewPrompt('');
    }
  };

  // Téléchargement du script en tant que bookmarklet
  const downloadBookmarklet = () => {
    const script = generateInjectionScript();
    const bookmarklet = `javascript:(${script})()`;
    
    const blob = new Blob([bookmarklet], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'automation-bookmarklet.js';
    a.click();
    
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Bot className="w-8 h-8 text-primary" />
            <div>
              <h2 className="text-2xl font-bold">Automation Script</h2>
              <p className="text-muted-foreground">
                Automatisation pour outils no-code (Bolt, Replit, V0, etc.)
              </p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              onClick={injectScript}
              disabled={isActive}
              className="flex items-center gap-2"
            >
              <Zap className="w-4 h-4" />
              {isActive ? 'Actif' : 'Activer'}
            </Button>
            
            <Button
              variant="outline"
              onClick={downloadBookmarklet}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Bookmarklet
            </Button>
          </div>
        </div>

        <Tabs defaultValue="platforms" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="platforms">Plateformes</TabsTrigger>
            <TabsTrigger value="prompts">Prompts</TabsTrigger>
            <TabsTrigger value="responses">Réponses</TabsTrigger>
            <TabsTrigger value="config">Config</TabsTrigger>
          </TabsList>

          <TabsContent value="platforms" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {SUPPORTED_PLATFORMS.map((platform) => (
                <Card key={platform.domain} className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Code className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold">{platform.name}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    {platform.domain}
                  </p>
                  <div className="space-y-2">
                    <Badge variant="outline" className="text-xs">
                      Input: {platform.inputSelector}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      Submit: {platform.submitSelector}
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="prompts" className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Nouveau prompt prédéfini..."
                value={newPrompt}
                onChange={(e) => setNewPrompt(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addPredefinedPrompt()}
              />
              <Button onClick={addPredefinedPrompt}>
                Ajouter
              </Button>
            </div>

            <ScrollArea className="h-96">
              <div className="space-y-3">
                {predefinedPrompts.map((prompt, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm flex-1">{prompt}</p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            // Injection automatique du prompt
                            if (isActive) {
                              setIsInjecting(true);
                              // Simulation de l'injection
                              setTimeout(() => setIsInjecting(false), 2000);
                            }
                          }}
                        >
                          <Play className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const newPrompts = predefinedPrompts.filter((_, i) => i !== index);
                            setPredefinedPrompts(newPrompts);
                          }}
                        >
                          ✕
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="responses" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Réponses récupérées</h3>
              <Badge variant="outline">
                {responses.length} réponses
              </Badge>
            </div>

            <ScrollArea className="h-96">
              <div className="space-y-4">
                {responses.map((response) => (
                  <Card key={response.id} className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        <span className="font-medium">{response.platform}</span>
                        <Badge 
                          variant={
                            response.status === 'completed' ? 'default' :
                            response.status === 'error' ? 'destructive' : 'secondary'
                          }
                        >
                          {response.status}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {response.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Prompt:</p>
                        <p className="text-sm">{response.prompt}</p>
                      </div>
                      {response.response && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Réponse:</p>
                          <p className="text-sm bg-muted p-2 rounded">
                            {response.response.substring(0, 200)}...
                          </p>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
                
                {responses.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    Aucune réponse récupérée pour le moment
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="config" className="space-y-4">
            <Card className="p-4">
              <h3 className="font-semibold mb-4">Configuration</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Mode automatique</p>
                    <p className="text-sm text-muted-foreground">
                      Récupération automatique des réponses
                    </p>
                  </div>
                  <Button
                    variant={autoMode ? "default" : "outline"}
                    onClick={() => setAutoMode(!autoMode)}
                  >
                    {autoMode ? "Activé" : "Désactivé"}
                  </Button>
                </div>
                
                <div className="space-y-2">
                  <p className="font-medium">Instructions d'installation</p>
                  <div className="bg-muted p-3 rounded text-sm">
                    <p className="mb-2">1. Cliquez sur "Activer" ou téléchargez le bookmarklet</p>
                    <p className="mb-2">2. Naviguez vers Bolt.new, Replit, V0, etc.</p>
                    <p className="mb-2">3. Le script détectera automatiquement la plateforme</p>
                    <p>4. Utilisez les prompts prédéfinis ou injectez vos propres prompts</p>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
};