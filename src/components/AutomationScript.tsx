import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useProjectContext } from '@/hooks/useProjectContext';
import { 
  Play, 
  Download, 
  Upload, 
  Settings, 
  Bot, 
  MessageSquare,
  Code,
  Zap,
  CheckCircle,
  AlertCircle,
  Clock
} from 'lucide-react';

interface PlatformConfig {
  name: string;
  domain: string;
  chatSelector: string;
  submitSelector: string;
  responseSelector: string;
  inputSelector: string;
}

interface PlanStep {
  id: string;
  title: string;
  prompt: string;
  completed: boolean;
  details?: string;
}

interface Plan {
  id: string;
  title: string;
  description: string;
  steps: PlanStep[];
}

interface AutomationResponse {
  id: string;
  platform: string;
  prompt: string;
  response: string;
  timestamp: Date;
  status: 'pending' | 'completed' | 'error';
  stepId?: string;
  analysisResult?: {
    shouldContinue: boolean;
    needsCorrection: boolean;
    correctionPrompt?: string;
    suggestion: string;
  };
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
  const { selectedProject } = useProjectContext();
  const [isActive, setIsActive] = useState(false);
  const [currentPlatform, setCurrentPlatform] = useState<string>('');
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [responses, setResponses] = useState<AutomationResponse[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [autoMode, setAutoMode] = useState(false);

  // Chargement des plans depuis Supabase
  useEffect(() => {
    const loadPlans = async () => {
      if (!selectedProject?.id) return;
      
      try {
        const { data, error } = await supabase
          .from('plans')
          .select('*')
          .eq('project_id', selectedProject.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        const formattedPlans: Plan[] = data?.map(plan => {
          const planData = plan.plan_data as any;
          return {
            id: plan.id,
            title: planData?.title || 'Plan sans titre',
            description: planData?.description || '',
            steps: planData?.steps?.map((step: any, index: number) => ({
              id: `${plan.id}-${index}`,
              title: step.title || step.nom || `Étape ${index + 1}`,
              prompt: step.prompt || step.description || step.details || '',
              completed: false,
              details: step.details || step.description
            })) || []
          };
        }) || [];

        setPlans(formattedPlans);
      } catch (error) {
        console.error('Erreur lors du chargement des plans:', error);
        toast({
          title: "Erreur",
          description: "Impossible de charger les plans",
          variant: "destructive",
        });
      }
    };

    loadPlans();
  }, [selectedProject?.id]);

  // Analyse de la réponse IA et décision de progression
  const analyzeResponse = async (response: string, stepIndex: number) => {
    try {
      const { data, error } = await supabase.functions.invoke('analyze-response', {
        body: {
          response,
          context: 'response_analysis',
          stepIndex
        }
      });

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Erreur lors de l\'analyse:', error);
      return {
        shouldContinue: true,
        needsCorrection: false,
        suggestion: 'Analyse automatique échouée, progression manuelle requise'
      };
    }
  };

  // Exécution automatique du plan
  const executeNextStep = async () => {
    if (!selectedPlan || currentStepIndex >= selectedPlan.steps.length) return;

    const currentStep = selectedPlan.steps[currentStepIndex];
    setIsExecuting(true);

    try {
      // Injection du prompt de l'étape actuelle
      const response = await new Promise((resolve, reject) => {
        // Communication avec le script injecté
        if (typeof window !== 'undefined' && (window as any).automationScript) {
          (window as any).automationScript.automate(currentStep.prompt, (result: any) => {
            if (result.success) {
              resolve(result.response);
            } else {
              reject(new Error(result.error));
            }
          });
        } else {
          reject(new Error('Script d\'automatisation non actif'));
        }
      });

      // Créer une réponse d'automatisation
      const automationResponse: AutomationResponse = {
        id: Date.now().toString(),
        platform: currentPlatform || 'Unknown',
        prompt: currentStep.prompt,
        response: response as string,
        timestamp: new Date(),
        status: 'completed',
        stepId: currentStep.id
      };

      // Analyser la réponse
      const analysis = await analyzeResponse(response as string, currentStepIndex);
      automationResponse.analysisResult = analysis;

      setResponses(prev => [...prev, automationResponse]);

      // Décider de la suite
      if (analysis.shouldContinue) {
        // Marquer l'étape comme terminée
        setSelectedPlan(prev => {
          if (!prev) return null;
          const updatedSteps = [...prev.steps];
          updatedSteps[currentStepIndex].completed = true;
          return { ...prev, steps: updatedSteps };
        });

        // Passer à l'étape suivante
        if (currentStepIndex + 1 < selectedPlan.steps.length) {
          setCurrentStepIndex(prev => prev + 1);
          
          if (autoMode) {
            // Continuer automatiquement après un délai
            setTimeout(() => executeNextStep(), 3000);
          }
        } else {
          // Plan terminé
          toast({
            title: "Plan terminé",
            description: "Toutes les étapes ont été exécutées avec succès",
          });
        }
      } else if (analysis.needsCorrection && analysis.correctionPrompt) {
        // Réessayer avec le prompt de correction
        toast({
          title: "Correction nécessaire",
          description: analysis.suggestion,
          variant: "destructive",
        });
      }

    } catch (error) {
      console.error('Erreur lors de l\'exécution:', error);
      toast({
        title: "Erreur d'exécution",
        description: error instanceof Error ? error.message : "Erreur inconnue",
        variant: "destructive",
      });
    } finally {
      setIsExecuting(false);
    }
  };

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
                Automatisation intelligente pour outils no-code
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

        <Tabs defaultValue="plans" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="plans">Plans</TabsTrigger>
            <TabsTrigger value="execution">Exécution</TabsTrigger>
            <TabsTrigger value="responses">Réponses</TabsTrigger>
            <TabsTrigger value="platforms">Plateformes</TabsTrigger>
          </TabsList>

          <TabsContent value="plans" className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Sélectionner un plan</h3>
                <Badge variant="outline">
                  {plans.length} plan(s) disponible(s)
                </Badge>
              </div>
              
              <Select
                value={selectedPlan?.id || ''}
                onValueChange={(value) => {
                  const plan = plans.find(p => p.id === value);
                  setSelectedPlan(plan || null);
                  setCurrentStepIndex(0);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un plan à automatiser..." />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.title} ({plan.steps.length} étapes)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedPlan && (
                <Card className="p-4">
                  <h4 className="font-semibold mb-2">{selectedPlan.title}</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    {selectedPlan.description}
                  </p>
                  
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Étapes du plan:</p>
                    {selectedPlan.steps.map((step, index) => (
                      <div key={step.id} className="flex items-center gap-2 p-2 bg-muted rounded">
                        {step.completed ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : index === currentStepIndex ? (
                          <Clock className="w-4 h-4 text-blue-500" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border-2 border-muted-foreground" />
                        )}
                        <span className="text-sm">{step.title}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="execution" className="space-y-4">
            {selectedPlan ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Exécution du plan</h3>
                  <div className="flex gap-2">
                    <Button
                      onClick={executeNextStep}
                      disabled={isExecuting || currentStepIndex >= selectedPlan.steps.length}
                      className="flex items-center gap-2"
                    >
                      <Play className="w-4 h-4" />
                      {isExecuting ? 'En cours...' : 'Exécuter étape'}
                    </Button>
                    
                    <Button
                      variant="outline"
                      onClick={() => setAutoMode(!autoMode)}
                      className="flex items-center gap-2"
                    >
                      <Settings className="w-4 h-4" />
                      {autoMode ? 'Mode auto ON' : 'Mode auto OFF'}
                    </Button>
                  </div>
                </div>

                <Card className="p-4">
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium">Progression:</span>
                      <Badge variant="outline">
                        {currentStepIndex + 1} / {selectedPlan.steps.length}
                      </Badge>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${((currentStepIndex) / selectedPlan.steps.length) * 100}%` 
                        }}
                      />
                    </div>
                  </div>

                  {currentStepIndex < selectedPlan.steps.length && (
                    <div className="space-y-3">
                      <h4 className="font-semibold">
                        Étape actuelle: {selectedPlan.steps[currentStepIndex].title}
                      </h4>
                      <div className="bg-muted p-3 rounded">
                        <p className="text-sm">
                          <strong>Prompt:</strong> {selectedPlan.steps[currentStepIndex].prompt}
                        </p>
                      </div>
                      {selectedPlan.steps[currentStepIndex].details && (
                        <div className="bg-blue-50 p-3 rounded border border-blue-200">
                          <p className="text-sm text-blue-800">
                            <strong>Détails:</strong> {selectedPlan.steps[currentStepIndex].details}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {currentStepIndex >= selectedPlan.steps.length && (
                    <div className="text-center py-8">
                      <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                      <h4 className="font-semibold text-green-700">Plan terminé!</h4>
                      <p className="text-sm text-muted-foreground">
                        Toutes les étapes ont été exécutées avec succès.
                      </p>
                    </div>
                  )}
                </Card>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Sélectionnez un plan dans l'onglet "Plans" pour commencer l'automatisation</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="responses" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Réponses d'automatisation</h3>
              <Badge variant="outline">
                {responses.length} réponse(s)
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
                        {response.analysisResult && (
                          <Badge 
                            variant={response.analysisResult.shouldContinue ? 'default' : 'destructive'}
                          >
                            {response.analysisResult.shouldContinue ? 'Continuer' : 'Arrêter'}
                          </Badge>
                        )}
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
                            {response.response.substring(0, 300)}
                            {response.response.length > 300 && '...'}
                          </p>
                        </div>
                      )}
                      {response.analysisResult && (
                        <div className="bg-blue-50 p-2 rounded border border-blue-200">
                          <p className="text-xs font-medium text-blue-800">Analyse IA:</p>
                          <p className="text-xs text-blue-700">{response.analysisResult.suggestion}</p>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
                
                {responses.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Aucune réponse récupérée pour le moment</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

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
        </Tabs>
      </Card>
    </div>
  );
};