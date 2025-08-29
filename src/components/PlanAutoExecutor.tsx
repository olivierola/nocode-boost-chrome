import { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Play, Pause, SkipForward, CheckCircle, AlertCircle, Clock, RefreshCw, Bot, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { ClaudeChatInput } from '@/components/ui/claude-style-ai-input';
import { supabase } from '@/integrations/supabase/client';
import { createNotification } from '@/utils/notificationHelper';

interface ExecutionStep {
  id: string;
  titre: string;
  description: string;
  prompt: string;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  result?: {
    status: 'success' | 'error' | 'ambiguous';
    message: string;
    suggestion?: string;
    needsUserAction?: boolean;
    userActionType?: 'api_key' | 'confirmation' | 'input';
    userActionPrompt?: string;
  };
}

interface PlanAutoExecutorProps {
  steps: ExecutionStep[];
  isOpen: boolean;
  onClose: () => void;
  mode: 'manual' | 'auto' | 'full-auto';
  onUpdateSteps: (steps: ExecutionStep[]) => void;
}

interface ExecutionLog {
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

const PlanAutoExecutor = ({ steps, isOpen, onClose, mode, onUpdateSteps }: PlanAutoExecutorProps) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [logs, setLogs] = useState<ExecutionLog[]>([]);
  const [showUserActionDialog, setShowUserActionDialog] = useState(false);
  const [userActionData, setUserActionData] = useState<any>(null);
  const [chatMessages, setChatMessages] = useState<string[]>([]);
  const [isAnalyzingResponse, setIsAnalyzingResponse] = useState(false);
  
  const { toast } = useToast();
  const { user } = useAuth();
  const abortControllerRef = useRef<AbortController | null>(null);

  const addLog = useCallback((message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { timestamp, message, type }]);
  }, []);

  const sendPromptToAI = async (prompt: string, stepIndex: number): Promise<{
    success: boolean;
    response: string;
    needsUserAction?: boolean;
    userActionType?: string;
    userActionPrompt?: string;
  }> => {
    addLog(`Envoi du prompt à l'outil IA: "${prompt.substring(0, 50)}..."`);
    
    try {
      // Envoyer le prompt via l'edge function
      const { data, error } = await supabase.functions.invoke('analyze-response', {
        body: {
          prompt,
          stepIndex,
          context: 'plan_execution'
        }
      });

      if (error) throw error;

      return {
        success: data.success || false,
        response: data.response || 'Aucune réponse reçue',
        needsUserAction: data.needsUserAction || false,
        userActionType: data.userActionType,
        userActionPrompt: data.userActionPrompt
      };

    } catch (error: any) {
      addLog(`Erreur lors de l'interaction avec l'IA: ${error.message}`, 'error');
      return {
        success: false,
        response: `Erreur technique: ${error.message}`
      };
    }
  };

  const analyzeAIResponse = async (response: string): Promise<{
    shouldContinue: boolean;
    needsCorrection: boolean;
    correctionPrompt?: string;
    suggestion?: string;
  }> => {
    addLog("Analyse de la réponse de l'outil IA...", 'info');
    setIsAnalyzingResponse(true);

    try {
      // Analyser la réponse via une edge function
      const { data, error } = await supabase.functions.invoke('analyze-response', {
        body: {
          response,
          context: 'response_analysis'
        }
      });

      if (error) throw error;

      return {
        shouldContinue: data.shouldContinue || false,
        needsCorrection: data.needsCorrection || false,
        correctionPrompt: data.correctionPrompt,
        suggestion: data.suggestion || "Analyse terminée"
      };

    } catch (error: any) {
      addLog(`Erreur lors de l'analyse: ${error.message}`, 'error');
      
      // Fallback : analyse basique par mots-clés
      const errorKeywords = ['erreur', 'error', 'échec', 'failed', 'impossible'];
      const successKeywords = ['succès', 'success', 'complété', 'terminé', 'réussi'];

      const hasError = errorKeywords.some(keyword => 
        response.toLowerCase().includes(keyword)
      );
      
      const hasSuccess = successKeywords.some(keyword => 
        response.toLowerCase().includes(keyword)
      );

      return {
        shouldContinue: hasSuccess && !hasError,
        needsCorrection: hasError && !hasSuccess,
        suggestion: hasSuccess ? "Étape réussie" : hasError ? "Erreur détectée" : "Réponse ambiguë"
      };

    } finally {
      setIsAnalyzingResponse(false);
    }
  };

  const executeStep = async (stepIndex: number, retryCount = 0): Promise<boolean> => {
    if (stepIndex >= steps.length) return true;

    const step = steps[stepIndex];
    setCurrentStepIndex(stepIndex);

    // Mettre à jour le statut de l'étape
    const updatedSteps = [...steps];
    updatedSteps[stepIndex] = { ...step, status: 'in_progress' };
    onUpdateSteps(updatedSteps);

    addLog(`Début de l'étape ${stepIndex + 1}: ${step.titre}`);

    try {
      // Interaction avec l'outil IA
      const toolResponse = await sendPromptToAI(step.prompt, stepIndex);
      
      setChatMessages(prev => [...prev, `Prompt envoyé: ${step.prompt}`, `Réponse: ${toolResponse.response}`]);

      if (toolResponse.needsUserAction) {
        // Gérer les actions utilisateur nécessaires
        setUserActionData({
          type: toolResponse.userActionType,
          prompt: toolResponse.userActionPrompt,
          stepIndex,
          retryCount
        });
        setShowUserActionDialog(true);
        setIsPaused(true);
        return false;
      }

      if (!toolResponse.success) {
        // Analyser la réponse pour déterminer la suite
        const analysis = await analyzeAIResponse(toolResponse.response);
        
        if (analysis.needsCorrection && retryCount < 2) {
          addLog(`Tentative de correction (${retryCount + 1}/2)`, 'warning');
          
          if (analysis.correctionPrompt) {
            // Réessayer avec un prompt corrigé
            const correctedStep = {
              ...step,
              prompt: analysis.correctionPrompt
            };
            updatedSteps[stepIndex] = correctedStep;
            onUpdateSteps(updatedSteps);
            
            return await executeStep(stepIndex, retryCount + 1);
          }
        }

        // Échec définitif
        updatedSteps[stepIndex] = {
          ...step,
          status: 'error',
          result: {
            status: 'error',
            message: toolResponse.response,
            suggestion: analysis.suggestion
          }
        };
        onUpdateSteps(updatedSteps);
        addLog(`Échec de l'étape ${stepIndex + 1}: ${toolResponse.response}`, 'error');
        
        if (mode === 'full-auto') {
          // En mode full-auto, continuer malgré l'erreur
          addLog("Mode automatique complet: continuation malgré l'erreur", 'warning');
          return await executeStep(stepIndex + 1);
        }
        
        return false;
      }

      // Succès
      const analysis = await analyzeAIResponse(toolResponse.response);
      
      updatedSteps[stepIndex] = {
        ...step,
        status: 'completed',
        result: {
          status: 'success',
          message: toolResponse.response,
          suggestion: analysis.suggestion
        }
      };
      onUpdateSteps(updatedSteps);

      // Create notification for step completion
      if (user) {
        await createNotification(
          user.id,
          'success',
          'Étape terminée',
          `Étape "${step.titre}" complétée avec succès`,
          { 
            step_index: stepIndex + 1,
            total_steps: steps.length,
            step_title: step.titre,
            action: 'step_completion'
          }
        );
      }
      addLog(`Étape ${stepIndex + 1} complétée avec succès`, 'success');

      // Validation selon le mode
      if (mode === 'manual') {
        setIsPaused(true);
        addLog("Mode manuel: en attente de validation utilisateur", 'info');
        return false;
      } else if (mode === 'auto' && !analysis.shouldContinue) {
        setIsPaused(true);
        addLog("Validation requise avant de continuer", 'warning');
        return false;
      }

      // Continuer automatiquement
      if (stepIndex + 1 < steps.length) {
        return await executeStep(stepIndex + 1);
      }

      // Plan completed - send notification
      if (user) {
        await createNotification(
          user.id,
          'success',
          'Plan terminé',
          'Toutes les étapes du plan ont été exécutées avec succès',
          { 
            total_steps: steps.length,
            action: 'plan_completion'
          }
        );
      }

      return true;

    } catch (error) {
      addLog(`Erreur lors de l'exécution de l'étape ${stepIndex + 1}: ${error}`, 'error');
      updatedSteps[stepIndex] = {
        ...step,
        status: 'error',
        result: {
          status: 'error',
          message: `Erreur technique: ${error}`
        }
      };
      onUpdateSteps(updatedSteps);
      return false;
    }
  };

  const startExecution = async () => {
    setIsExecuting(true);
    setIsPaused(false);
    abortControllerRef.current = new AbortController();
    
    addLog(`Début de l'exécution en mode ${mode}`, 'info');
    
    try {
      await executeStep(currentStepIndex);
    } catch (error) {
      addLog(`Erreur générale: ${error}`, 'error');
    } finally {
      if (!isPaused) {
        setIsExecuting(false);
        addLog("Exécution terminée", 'info');
      }
    }
  };

  const pauseExecution = () => {
    setIsPaused(true);
    setIsExecuting(false);
    abortControllerRef.current?.abort();
    addLog("Exécution mise en pause", 'warning');
  };

  const resumeExecution = () => {
    if (isPaused) {
      setIsPaused(false);
      startExecution();
    }
  };

  const skipCurrentStep = async () => {
    const updatedSteps = [...steps];
    const step = steps[currentStepIndex];
    updatedSteps[currentStepIndex] = {
      ...step,
      status: 'completed',
      result: {
        status: 'success',
        message: "Étape ignorée par l\\'utilisateur"
      }
    };
    onUpdateSteps(updatedSteps);
    addLog(`Étape ${currentStepIndex + 1} ignorée`, 'warning');

    // Create notification for skipped step
    if (user) {
      await createNotification(
        user.id,
        'warning',
        'Étape ignorée',
        `Étape "${step.titre}" ignorée`,
        { 
          step_index: currentStepIndex + 1,
          total_steps: steps.length,
          step_title: step.titre,
          action: 'step_skipped'
        }
      );
    }
    
    if (currentStepIndex + 1 < steps.length) {
      setCurrentStepIndex(currentStepIndex + 1);
      if (!isPaused) {
        executeStep(currentStepIndex + 1);
      }
    }
  };

  const retryCurrentStep = () => {
    if (currentStepIndex < steps.length) {
      executeStep(currentStepIndex);
    }
  };

  const handleUserAction = (result: any) => {
    setShowUserActionDialog(false);
    addLog(`Action utilisateur: ${userActionData?.type} - ${result ? 'Accepté' : 'Refusé'}`, 'info');
    
    if (result && userActionData) {
      // Continuer l'exécution après l'action utilisateur
      setIsPaused(false);
      executeStep(userActionData.stepIndex, userActionData.retryCount);
    }
    setUserActionData(null);
  };

  const progress = steps.length > 0 ? Math.round((currentStepIndex / steps.length) * 100) : 0;
  const completedSteps = steps.filter(s => s.status === 'completed').length;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Exécuteur Automatique - Mode {mode === 'manual' ? 'Manuel' : mode === 'auto' ? 'Automatique' : 'Automatique Complet'}
            </DialogTitle>
            <DialogDescription>
              Exécution automatique avec interaction IA en temps réel
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Progress Overview */}
            <Card>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Progression globale</span>
                    <Badge variant="outline">{completedSteps}/{steps.length} étapes</Badge>
                  </div>
                  <Progress value={progress} className="h-2" />
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      {isExecuting && !isPaused ? (
                        <>
                          <RefreshCw className="h-3 w-3 animate-spin" />
                          Exécution en cours...
                        </>
                      ) : isPaused ? (
                        <>
                          <Pause className="h-3 w-3" />
                          En pause
                        </>
                      ) : (
                        <>
                          <Clock className="h-3 w-3" />
                          En attente
                        </>
                      )}
                    </span>
                    {isAnalyzingResponse && (
                      <span className="flex items-center gap-1">
                        <Bot className="h-3 w-3 animate-pulse" />
                        Analyse de la réponse IA...
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Controls */}
            <div className="flex gap-2">
              {!isExecuting && !isPaused ? (
                <Button onClick={startExecution} size="sm">
                  <Play className="h-4 w-4 mr-2" />
                  Démarrer
                </Button>
              ) : isExecuting && !isPaused ? (
                <Button onClick={pauseExecution} variant="outline" size="sm">
                  <Pause className="h-4 w-4 mr-2" />
                  Pause
                </Button>
              ) : (
                <Button onClick={resumeExecution} size="sm">
                  <Play className="h-4 w-4 mr-2" />
                  Reprendre
                </Button>
              )}
              
              {currentStepIndex < steps.length && (
                <>
                  <Button onClick={skipCurrentStep} variant="outline" size="sm">
                    <SkipForward className="h-4 w-4 mr-2" />
                    Ignorer
                  </Button>
                  <Button onClick={retryCurrentStep} variant="outline" size="sm">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Réessayer
                  </Button>
                </>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Steps List */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Étapes du plan
                </h3>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {steps.map((step, index) => (
                      <Card 
                        key={step.id} 
                        className={`${
                          index === currentStepIndex 
                            ? 'border-primary bg-primary/5' 
                            : step.status === 'completed' 
                              ? 'border-green-200 bg-green-50' 
                              : step.status === 'error'
                                ? 'border-red-200 bg-red-50'
                                : 'border-gray-200'
                        }`}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-start gap-2">
                            {step.status === 'completed' ? (
                              <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                            ) : step.status === 'error' ? (
                              <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                            ) : index === currentStepIndex && isExecuting ? (
                              <RefreshCw className="h-4 w-4 text-blue-500 animate-spin flex-shrink-0" />
                            ) : (
                              <Clock className="h-4 w-4 text-gray-400 flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <h4 className="text-xs font-medium truncate">{step.titre}</h4>
                              <p className="text-xs text-muted-foreground truncate">
                                {step.description}
                              </p>
                              {step.result && (
                                <div className="mt-2">
                                  <Badge 
                                    variant={step.result.status === 'success' ? 'default' : 'destructive'}
                                    className="text-xs"
                                  >
                                    {step.result.status === 'success' ? 'Succès' : 'Erreur'}
                                  </Badge>
                                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                    {step.result.message}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Logs & Chat */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Logs d'exécution
                </h3>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-1">
                    {logs.map((log, index) => (
                      <div 
                        key={index} 
                        className={`text-xs p-2 rounded font-mono ${
                          log.type === 'error' ? 'bg-red-100 text-red-800' :
                          log.type === 'success' ? 'bg-green-100 text-green-800' :
                          log.type === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-muted text-muted-foreground'
                        }`}
                      >
                        <span className="opacity-60">[{log.timestamp}]</span> {log.message}
                      </div>
                    ))}
                    {chatMessages.map((message, index) => (
                      <div key={`chat-${index}`} className="text-xs bg-blue-50 p-2 rounded">
                        <span className="text-blue-600">💬</span> {message}
                      </div>
                    ))}
                    {logs.length === 0 && (
                      <p className="text-xs text-muted-foreground p-2">
                        Aucun log disponible
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* User Action Dialog */}
      <Dialog open={showUserActionDialog} onOpenChange={setShowUserActionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Action requise</DialogTitle>
            <DialogDescription>
              L'exécution nécessite une intervention de votre part
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {userActionData?.prompt || "Une action est requise pour continuer"}
              </AlertDescription>
            </Alert>
            
            {userActionData?.type === 'api_key' && (
              <div className="space-y-2">
                <ClaudeChatInput
                  placeholder="Entrez votre clé API..."
                  onSendMessage={(value) => handleUserAction(value)}
                />
              </div>
            )}
            
            <div className="flex gap-2">
              <Button 
                onClick={() => handleUserAction(true)}
                className="flex-1"
              >
                Continuer
              </Button>
              <Button 
                variant="outline" 
                onClick={() => handleUserAction(false)}
              >
                Annuler
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PlanAutoExecutor;