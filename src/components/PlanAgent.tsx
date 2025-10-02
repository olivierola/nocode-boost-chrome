import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useProjectContext } from '@/hooks/useProjectContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Bot, Play, Pause, RotateCcw, Zap, Brain, Target, CheckCircle, AlertCircle, Clock, MousePointer2, Key } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createNotification, notifyPlanStepCompletion, notifyPlanCompletion } from '@/utils/notificationHelper';

interface AgentAction {
  id: string;
  type: 'optimize_prompt' | 'generate_step' | 'analyze_response' | 'suggest_improvement' | 'inject_knowledge' | 'click_approve' | 'click_fix_error' | 'request_api_key';
  title: string;
  description: string;
  status: 'pending' | 'executing' | 'completed' | 'error';
  prompt?: string;
  result?: any;
  timestamp: Date;
  context?: any;
  domSelector?: string;
  apiKeyName?: string;
}

interface PlanAgentProps {
  plan: any;
  isActive: boolean;
  currentStep?: any;
  executionContext?: any;
  onPromptOptimized?: (optimizedPrompt: string, context: any) => void;
  onStepGenerated?: (step: any) => void;
  onAnalysisResult?: (analysis: any) => void;
}

const PlanAgent: React.FC<PlanAgentProps> = ({
  plan,
  isActive,
  currentStep,
  executionContext,
  onPromptOptimized,
  onStepGenerated,
  onAnalysisResult
}) => {
  const { user } = useAuth();
  const { selectedProject } = useProjectContext();
  
  const [agentStatus, setAgentStatus] = useState<'idle' | 'monitoring' | 'processing' | 'error'>('idle');
  const [actions, setActions] = useState<AgentAction[]>([]);
  const [contextHistory, setContextHistory] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [canInteractWithDOM, setCanInteractWithDOM] = useState(false);

  // Surveille l'avancement et génère des actions
  const monitorAndAnalyze = useCallback(async () => {
    if (!isActive || !plan || !selectedProject || !user) return;

    setAgentStatus('monitoring');
    
    try {
      const { data, error } = await supabase.functions.invoke('plan-agent', {
        body: {
          action: 'monitor_progress',
          plan_id: plan.id,
          project_id: selectedProject.id,
          user_id: user.id,
          current_step: currentStep,
          execution_context: executionContext,
          context_history: contextHistory
        }
      });

      if (error) throw error;

      if (data.suggested_actions) {
        const newActions: AgentAction[] = data.suggested_actions.map((action: any, index: number) => ({
          id: `action_${Date.now()}_${index}`,
          type: action.type,
          title: action.title,
          description: action.description,
          status: 'pending',
          prompt: action.prompt,
          timestamp: new Date(),
          context: action.context
        }));

        setActions(prev => [...prev, ...newActions]);
      }

      if (data.analysis) {
        onAnalysisResult?.(data.analysis);
      }

      setAgentStatus('idle');
    } catch (error) {
      console.error('Erreur monitoring agent:', error);
      setAgentStatus('error');
      toast.error('Erreur lors du monitoring par l\'agent');
    }
  }, [isActive, plan, selectedProject, user, currentStep, executionContext, contextHistory]);

  // Interagit avec le DOM
  const interactWithDOM = useCallback(async (action: AgentAction) => {
    if (!action.domSelector) return false;

    try {
      // Vérifie si on est dans le contexte de l'extension Chrome
      if (typeof chrome !== 'undefined' && chrome.tabs) {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab.id) {
          await chrome.tabs.sendMessage(tab.id, {
            action: 'clickElement',
            selector: action.domSelector
          });
          return true;
        }
      }
      
      // Sinon, tente de cliquer directement dans la page
      const element = document.querySelector(action.domSelector);
      if (element && element instanceof HTMLElement) {
        element.click();
        return true;
      }
    } catch (error) {
      console.error('Erreur interaction DOM:', error);
    }
    return false;
  }, []);

  // Enregistre une action dans la base de données
  const recordAgentAction = useCallback(async (action: AgentAction, result: any) => {
    if (!user || !selectedProject || !plan) return;

    try {
      await supabase.from('agent_actions').insert({
        project_id: selectedProject.id,
        plan_id: plan.id,
        user_id: user.id,
        action_type: action.type,
        step_name: currentStep?.nom || null,
        step_index: currentStep?.index || null,
        action_details: {
          title: action.title,
          description: action.description,
          prompt: action.prompt,
          context: action.context
        },
        result: JSON.stringify(result)
      });
    } catch (error) {
      console.error('Erreur enregistrement action:', error);
    }
  }, [user, selectedProject, plan, currentStep]);

  // Exécute une action de l'agent
  const executeAction = async (action: AgentAction) => {
    setIsProcessing(true);
    setActions(prev => 
      prev.map(a => a.id === action.id ? { ...a, status: 'executing' } : a)
    );

    try {
      // Actions spéciales qui nécessitent une interaction DOM
      if (action.type === 'click_approve' || action.type === 'click_fix_error') {
        const domSuccess = await interactWithDOM(action);
        
        if (domSuccess) {
          await recordAgentAction(action, { success: true, method: 'dom_interaction' });
          
          setActions(prev => 
            prev.map(a => a.id === action.id ? { 
              ...a, 
              status: 'completed',
              result: { domInteraction: true }
            } : a)
          );

          toast.success(`Action "${action.title}" exécutée avec succès`);
          
          // Notifie l'utilisateur
          if (user) {
            await createNotification(
              user.id,
              'success',
              'Action de l\'agent',
              `L'agent a ${action.type === 'click_approve' ? 'approuvé' : 'corrigé'} une action automatiquement`
            );
          }
        } else {
          throw new Error('Impossible d\'interagir avec l\'élément DOM');
        }
      } 
      // Action pour demander une clé API
      else if (action.type === 'request_api_key') {
        if (user && action.apiKeyName) {
          await createNotification(
            user.id,
            'warning',
            'Clé API requise',
            `L'agent a besoin de la clé API: ${action.apiKeyName}`,
            { api_key_name: action.apiKeyName, plan_id: plan.id }
          );
        }

        await recordAgentAction(action, { api_key_requested: action.apiKeyName });
        
        setActions(prev => 
          prev.map(a => a.id === action.id ? { 
            ...a, 
            status: 'completed',
            result: { notificationSent: true }
          } : a)
        );

        toast.info(`Notification envoyée: clé API "${action.apiKeyName}" requise`);
      }
      // Actions normales via l'edge function
      else {
        const { data, error } = await supabase.functions.invoke('plan-agent', {
          body: {
            action: 'execute_action',
            action_type: action.type,
            action_data: action,
            plan_id: plan.id,
            project_id: selectedProject!.id,
            user_id: user!.id,
            context_history: contextHistory
          }
        });

        if (error) throw error;

        // Enregistre l'action
        await recordAgentAction(action, data);

        // Mise à jour du contexte
        setContextHistory(prev => [...prev, {
          timestamp: new Date(),
          action: action.type,
          input: action,
          output: data
        }]);

        // Actions spécifiques selon le type
        switch (action.type) {
          case 'optimize_prompt':
            if (data.optimized_prompt) {
              onPromptOptimized?.(data.optimized_prompt, data.context);
            }
            break;
          case 'generate_step':
            if (data.generated_step) {
              onStepGenerated?.(data.generated_step);
              
              // Notifie la création d'une étape intermédiaire
              if (user) {
                await createNotification(
                  user.id,
                  'info',
                  'Étape intermédiaire créée',
                  `L'agent a créé une nouvelle étape: ${data.generated_step.nom}`,
                  { plan_id: plan.id, step: data.generated_step }
                );
              }
            }
            break;
          case 'analyze_response':
            if (data.analysis) {
              onAnalysisResult?.(data.analysis);
            }
            break;
        }

        setActions(prev => 
          prev.map(a => a.id === action.id ? { 
            ...a, 
            status: 'completed',
            result: data 
          } : a)
        );

        toast.success(`Action "${action.title}" exécutée avec succès`);
      }
    } catch (error) {
      console.error('Erreur exécution action:', error);
      setActions(prev => 
        prev.map(a => a.id === action.id ? { ...a, status: 'error' } : a)
      );
      toast.error(`Erreur lors de l'exécution de "${action.title}"`);
      
      // Notifie l'erreur
      if (user) {
        await createNotification(
          user.id,
          'error',
          'Erreur de l\'agent',
          `Échec de l'action: ${action.title}`,
          { action_id: action.id, error: String(error) }
        );
      }
    }

    setIsProcessing(false);
  };

  // Notifie la complétion d'une étape
  const notifyStepCompletion = useCallback(async (stepName: string, stepIndex: number, totalSteps: number) => {
    if (!user || !plan) return;
    
    await notifyPlanStepCompletion(user.id, plan.id, stepName, stepIndex, totalSteps);
    toast.success(`Étape "${stepName}" complétée!`);
  }, [user, plan]);

  // Notifie la complétion du plan
  const notifyPlanCompleted = useCallback(async () => {
    if (!user || !plan) return;
    
    const planTitle = plan.plan_data?.titre || 'Plan';
    await notifyPlanCompletion(user.id, plan.id, planTitle);
    toast.success(`Plan "${planTitle}" terminé avec succès!`, {
      duration: 5000
    });
  }, [user, plan]);

  // Monitoring automatique
  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      monitorAndAnalyze();
    }, 30000); // Toutes les 30 secondes

    return () => clearInterval(interval);
  }, [isActive, monitorAndAnalyze]);

  // Monitoring initial
  useEffect(() => {
    if (isActive) {
      monitorAndAnalyze();
    }
  }, [isActive, currentStep, executionContext]);

  const getStatusIcon = (status: typeof agentStatus) => {
    switch (status) {
      case 'monitoring': return <Bot className="w-4 h-4 animate-pulse text-blue-500" />;
      case 'processing': return <Brain className="w-4 h-4 animate-spin text-orange-500" />;
      case 'error': return <AlertCircle className="w-4 h-4 text-red-500" />;
      default: return <Bot className="w-4 h-4 text-green-500" />;
    }
  };

  const getActionIcon = (type: AgentAction['type']) => {
    switch (type) {
      case 'optimize_prompt': return <Zap className="w-4 h-4" />;
      case 'generate_step': return <Target className="w-4 h-4" />;
      case 'analyze_response': return <Brain className="w-4 h-4" />;
      case 'suggest_improvement': return <CheckCircle className="w-4 h-4" />;
      case 'inject_knowledge': return <Bot className="w-4 h-4" />;
      case 'click_approve': return <MousePointer2 className="w-4 h-4" />;
      case 'click_fix_error': return <AlertCircle className="w-4 h-4" />;
      case 'request_api_key': return <Key className="w-4 h-4" />;
      default: return <Bot className="w-4 h-4" />;
    }
  };

  const getActionStatusColor = (status: AgentAction['status']) => {
    switch (status) {
      case 'executing': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'error': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getStatusIcon(agentStatus)}
          Agent de Plan Intelligent
          <Badge variant={isActive ? "default" : "secondary"}>
            {isActive ? 'Actif' : 'Inactif'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status */}
        <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">État:</span>
            <Badge variant="outline" className="text-xs">
              {agentStatus === 'monitoring' && 'Surveillance en cours'}
              {agentStatus === 'processing' && 'Traitement'}
              {agentStatus === 'idle' && 'En attente'}
              {agentStatus === 'error' && 'Erreur'}
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground">
            {actions.length} actions générées
          </div>
        </div>

        {/* Actions de l'agent */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Actions Suggérées</h4>
            <Button
              size="sm"
              variant="outline"
              onClick={monitorAndAnalyze}
              disabled={agentStatus === 'monitoring' || isProcessing}
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              Analyser
            </Button>
          </div>

          <ScrollArea className="h-64">
            <AnimatePresence>
              {actions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  L'agent analysera automatiquement le plan et suggèrera des actions
                </div>
              ) : (
                <div className="space-y-2">
                  {actions.map((action) => (
                    <motion.div
                      key={action.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className={`p-3 border rounded-lg ${getActionStatusColor(action.status)}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 flex-1">
                          {getActionIcon(action.type)}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm">{action.title}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {action.description}
                            </div>
                            {action.prompt && (
                              <div className="text-xs bg-background/50 p-2 rounded mt-2 font-mono">
                                {action.prompt.substring(0, 100)}...
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {action.status === 'pending' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => executeAction(action)}
                              disabled={isProcessing}
                              className="h-6 px-2"
                            >
                              <Play className="w-3 h-3" />
                            </Button>
                          )}
                          {action.status === 'executing' && (
                            <Clock className="w-3 h-3 animate-spin" />
                          )}
                          {action.status === 'completed' && (
                            <CheckCircle className="w-3 h-3 text-green-600" />
                          )}
                          {action.status === 'error' && (
                            <AlertCircle className="w-3 h-3 text-red-600" />
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </AnimatePresence>
          </ScrollArea>
        </div>

        {/* Contexte */}
        {contextHistory.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Historique de Contexte</h4>
              <div className="text-xs text-muted-foreground">
                {contextHistory.length} interactions enregistrées
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default PlanAgent;