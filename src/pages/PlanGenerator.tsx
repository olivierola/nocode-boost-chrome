import { useState, useEffect, useRef } from 'react';
import { Bot, User, Target, Play, HelpCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useProjectContext } from '@/hooks/useProjectContext';
import { ClaudeChatInput } from '@/components/ui/claude-style-ai-input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import AutoExecutionDialog from '@/components/AutoExecutionDialog';
import PlanAutoExecutor from '@/components/PlanAutoExecutor';
import { MindmapModal } from '@/components/MindmapModal';
import { PlanSummaryCard } from '@/components/PlanSummaryCard';
import { PlanMindmapVisualization } from '@/components/PlanMindmapVisualization';
import { PlanTableView } from '@/components/PlanTableView';
import { Component as RaycastBackground } from '@/components/ui/raycast-animated-background';

interface ProjectPlan {
  id: string;
  project_id: string;
  title?: string;
  description?: string;
  status?: 'draft' | 'validated' | 'executing' | 'completed';
  plan_type?: 'standard' | 'mindmap';
  mindmap_data?: any;
  steps: Array<{
    id: string;
    title: string;
    description: string;
    status: 'pending' | 'in_progress' | 'completed' | 'error';
  }>;
  // New properties for plan data
  startupPrompt?: {
    initialSetup?: string;
  };
  features?: Array<{
    name: string;
    description: string;
    priority?: string;
    prompt?: string;
    sub_features?: Array<{
      name: string;
      description: string;
      priority?: string;
      prompt?: string;
    }>;
  }>;
  visualIdentity?: {
    detailedSteps?: Array<{
      step: string;
      description: string;
      prompt?: string;
      deliverables?: string[];
    }>;
  };
  pages?: Array<{
    name: string;
    description: string;
    priority?: string;
    prompt?: string;
  }>;
  created_at: string;
  updated_at: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  plan?: ProjectPlan;
  type?: 'clarification_needed' | 'mindmap_plan' | 'standard';
  questions?: string[];
}

const PlanGenerator = () => {
  const [plans, setPlans] = useState<ProjectPlan[]>([]);
  const [currentPlan, setCurrentPlan] = useState<ProjectPlan | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [showExecutionDialog, setShowExecutionDialog] = useState(false);
  const [executionMode, setExecutionMode] = useState<'manual' | 'auto' | 'full-auto'>('manual');
  const [isExecuting, setIsExecuting] = useState(false);
  const [showMindmapModal, setShowMindmapModal] = useState(false);
  const [selectedMindmapData, setSelectedMindmapData] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'chat' | 'table'>('chat');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { user } = useAuth();
  const { selectedProject } = useProjectContext();
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  useEffect(() => {
    if (selectedProject) {
      // Load conversation history
      loadConversationHistory();
    }
  }, [selectedProject]);

  const loadConversationHistory = async () => {
    if (!selectedProject || !user) return;

    try {
      const { data, error } = await supabase.rpc('get_plan_chat_history', {
        p_project_id: selectedProject.id,
        p_user_id: user.id
      });

      if (error) throw error;

      if (data && data.length > 0) {
        const messages: ChatMessage[] = data.map((msg: any) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: new Date(msg.created_at),
          type: msg.message_type as 'clarification_needed' | 'mindmap_plan' | 'standard',
          questions: msg.questions || [],
          plan: msg.plan_data ? {
            ...msg.plan_data,
            id: msg.plan_data.id || msg.id,
            project_id: selectedProject.id,
            created_at: msg.created_at,
            updated_at: msg.created_at
          } : undefined
        }));
        
        setChatMessages(messages);
      }
    } catch (error) {
      console.error('Error loading conversation history:', error);
    }
  };

  const saveConversationMessage = async (message: ChatMessage) => {
    if (!selectedProject || !user) return;

    try {
      await supabase.rpc('save_plan_chat_message', {
        p_project_id: selectedProject.id,
        p_user_id: user.id,
        p_role: message.role,
        p_content: message.content,
        p_message_type: message.type || 'standard',
        p_plan_data: message.plan ? JSON.stringify(message.plan) : null,
        p_questions: message.questions || null
      });
    } catch (error) {
      console.error('Error saving conversation message:', error);
    }
  };

  const fetchPlans = async () => {
    if (!user || !selectedProject) return;

    try {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .eq('project_id', selectedProject.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPlans((data as unknown as ProjectPlan[]) || []);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les plans",
        variant: "destructive",
      });
    }
  };

  const generatePlan = async (prompt: string) => {
    if (!selectedProject) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un projet",
        variant: "destructive",
      });
      return;
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: prompt,
      timestamp: new Date()
    };
    setChatMessages(prev => [...prev, userMessage]);
    
    // Save user message to conversation history
    await saveConversationMessage(userMessage);

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-plan', {
        body: {
          prompt,
          projectId: selectedProject.id
        }
      });

      if (error) throw error;

      // Gérer les différents types de réponse
      if (data.type === 'clarification_needed') {
        const aiMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.message,
          timestamp: new Date(),
          type: 'clarification_needed',
          questions: data.questions
        };
        setChatMessages(prev => [...prev, aiMessage]);
        await saveConversationMessage(aiMessage);
        return;
      }

      if (data.type === 'mindmap_plan') {
        // Plan mindmap généré et sauvegardé
        const planForMessage: ProjectPlan = {
          id: data.id,
          project_id: selectedProject.id,
          title: data.title,
          description: data.description,
          plan_type: 'mindmap',
          mindmap_data: data,
          steps: data.features?.map((feature: any, index: number) => ({
            id: feature.id || `feature-${index}`,
            title: feature.title || feature.name || `Fonctionnalité ${index + 1}`,
            description: feature.description || '',
            status: 'pending' as const
          })) || [],
          features: data.features || [],
          pages: data.pages || [],
          status: 'draft',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const featuresCount = data.features?.length || 0;
        const pagesCount = data.pages?.length || 0;

        const aiMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `J'ai créé un plan mindmap complet pour votre projet ! Il comprend ${featuresCount} fonctionnalités principales, ${pagesCount} pages, une étude de marché et une identité visuelle. Vous pouvez ouvrir la mindmap interactive pour explorer tous les détails.`,
          timestamp: new Date(),
          plan: planForMessage,
          type: 'mindmap_plan'
        };
        setChatMessages(prev => [...prev, aiMessage]);
        await saveConversationMessage(aiMessage);
        fetchPlans(); // Rafraîchir la liste des plans
        return;
      }

      // Plan standard (fallback) - Convert features to steps if available
      let steps = [];
      if (data.features && Array.isArray(data.features)) {
        steps = data.features.map((feature: any, index: number) => ({
          id: feature.id || `feature-${index}`,
          title: feature.title || feature.name || `Fonctionnalité ${index + 1}`,
          description: feature.description || '',
          status: 'pending' as const
        }));
      } else if (data.steps && Array.isArray(data.steps)) {
        steps = data.steps;
      } else if (data.roadmap?.phases && Array.isArray(data.roadmap.phases)) {
        steps = data.roadmap.phases.map((phase: any, index: number) => ({
          id: phase.id || `phase-${index}`,
          title: phase.name || `Phase ${index + 1}`,
          description: phase.description || '',
          status: 'pending' as const
        }));
      }

      const planForMessage: ProjectPlan = {
        id: data.id || Date.now().toString(),
        project_id: selectedProject.id,
        title: data.title || `Plan pour ${selectedProject.name}`,
        description: data.description || prompt,
        steps: steps,
        status: 'draft',
        plan_type: 'standard',
        features: data.features || [],
        pages: data.pages || [],
        visualIdentity: data.visualIdentity || null,
        startupPrompt: data.startupPrompt || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `J'ai généré un plan détaillé pour votre projet ! Le plan comprend ${steps.length} étapes principales. Vous pouvez continuer à discuter pour l'affiner.`,
        timestamp: new Date(),
        plan: planForMessage
      };
      setChatMessages(prev => [...prev, aiMessage]);
      await saveConversationMessage(aiMessage);

      toast({
        title: "Plan généré",
        description: "Votre plan a été créé avec succès",
      });

      fetchPlans();
    } catch (error) {
      console.error('Erreur lors de la génération du plan:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: "Désolé, j'ai rencontré une erreur lors de la génération du plan. Pouvez-vous reformuler votre demande ?",
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, errorMessage]);
      await saveConversationMessage(errorMessage);
      toast({
        title: "Erreur",
        description: "Impossible de générer le plan",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const deletePlan = async (planId: string) => {
    try {
      const { error } = await supabase
        .from('plans')
        .delete()
        .eq('id', planId);

      if (error) throw error;

      toast({
        title: "Plan supprimé",
        description: "Le plan a été supprimé avec succès",
      });

      fetchPlans();
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le plan",
        variant: "destructive",
      });
    }
  };

  const startExecution = (mode: 'manual' | 'auto' | 'full-auto') => {
    setExecutionMode(mode);
    setIsExecuting(true);
    setShowExecutionDialog(true);
    
    toast({
      title: "Exécution démarrée",
      description: `Mode ${mode === 'manual' ? 'manuel' : mode === 'auto' ? 'automatique' : 'automatique complet'} activé`,
    });
  };

  const updatePlanSteps = (steps: any[]) => {
    if (currentPlan) {
      const updatedPlan = { ...currentPlan, steps };
      setCurrentPlan(updatedPlan);
    }
  };

  const openMindmap = (plan: ProjectPlan) => {
    if (plan.mindmap_data) {
      setSelectedMindmapData(plan.mindmap_data);
      setShowMindmapModal(true);
    } else {
      toast({
        title: "Mindmap indisponible",
        description: "Ce plan n'a pas de données mindmap associées",
        variant: "destructive",
      });
    }
  };

  const executeFeatureFromMindmap = (feature: any) => {
    // Créer un plan temporaire avec cette feature
    const tempPlan: ProjectPlan = {
      id: 'temp-' + Date.now(),
      project_id: selectedProject?.id || '',
      title: `Exécution: ${feature.title}`,
      description: feature.description,
      steps: [{
        id: feature.id,
        title: feature.title,
        description: feature.description,
        status: 'pending' as const
      }],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    setCurrentPlan(tempPlan);
    setShowMindmapModal(false);
    setShowExecutionDialog(true);
    setIsExecuting(true);
  };

  useEffect(() => {
    fetchPlans();
  }, [user, selectedProject]);

  if (!selectedProject) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Target className="h-16 w-16 text-muted-foreground mx-auto" />
          <h2 className="text-2xl font-bold text-foreground">Aucun projet sélectionné</h2>
          <p className="text-muted-foreground text-lg max-w-md">
            Veuillez d'abord sélectionner un projet depuis le sélecteur de projet pour commencer
          </p>
        </div>
      </div>
    );
  }

  // Convert plan to tasks format for AgentPlan component
  const convertPlanToTasks = (plan: ProjectPlan) => {
    const tasks: any[] = [];
    let taskId = 1;

    // Add startup prompt as first task
    if (plan.startupPrompt) {
      tasks.push({
        id: taskId.toString(),
        title: "Prompt de démarrage",
        description: plan.startupPrompt.initialSetup || "Configuration initiale du projet",
        status: "pending",
        priority: "high",
        level: 0,
        dependencies: [],
        subtasks: [],
        prompt: plan.startupPrompt.initialSetup
      });
      taskId++;
    }

    // Add features
    if (plan.features) {
      plan.features.forEach((feature, index) => {
        const featureTask = {
          id: taskId.toString(),
          title: feature.name,
          description: feature.description,
          status: "pending",
          priority: feature.priority || "medium",
          level: 0,
          dependencies: [],
          subtasks: feature.sub_features?.map((subFeature, subIndex) => ({
            id: `${taskId}.${subIndex + 1}`,
            title: subFeature.name,
            description: subFeature.description,
            status: "pending",
            priority: subFeature.priority || "medium",
            prompt: subFeature.prompt
          })) || [],
          prompt: feature.prompt
        };
        tasks.push(featureTask);
        taskId++;
      });
    }

    // Add visual identity steps
    if (plan.visualIdentity?.detailedSteps) {
      tasks.push({
        id: taskId.toString(),
        title: "Identité visuelle",
        description: "Création de l'identité visuelle complète",
        status: "pending",
        priority: "medium",
        level: 0,
        dependencies: [],
        subtasks: plan.visualIdentity.detailedSteps.map((step: any, index: number) => ({
          id: `${taskId}.${index + 1}`,
          title: step.step,
          description: step.description,
          status: "pending",
          priority: "medium",
          tools: step.deliverables,
          prompt: step.prompt
        }))
      });
      taskId++;
    }

    // Add pages
    if (plan.pages) {
      plan.pages.forEach((page, index) => {
        tasks.push({
          id: taskId.toString(),
          title: page.name,
          description: page.description,
          status: "pending",
          priority: page.priority || "medium",
          level: 0,
          dependencies: [],
          subtasks: [],
          prompt: page.prompt
        });
        taskId++;
      });
    }

    return tasks;
  };

  return (
    <div className="w-full h-screen flex flex-col relative overflow-hidden">
      {/* Raycast Animated Background */}
      <div className="absolute inset-0 w-full h-full">
        <RaycastBackground />
      </div>

      {/* Header with view toggle */}
      {currentPlan && (
        <div className="relative z-10 px-6 py-4 border-b border-border bg-background/50 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">Plan de développement</h1>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'chat' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('chat')}
              >
                Chat
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('table')}
              >
                Tableau
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {chatMessages.length === 0 ? (
        /* Empty state with centered chat and dark background */
        <div className="flex-1 flex flex-col items-center justify-center px-6 relative">
          {/* Dark overlay to match login screen */}
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
          
          <div className="relative z-10 text-center mb-8">
            <Target className="h-16 w-16 text-white/80 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Générateur de Plans - {selectedProject.name}</h2>
            <p className="text-white/70 text-lg max-w-md">
              Décrivez votre idée et l'IA vous aidera à créer un plan détaillé étape par étape
            </p>
          </div>
          
          <div className="relative z-10 w-full max-w-2xl">
            <ClaudeChatInput
              onSendMessage={(message) => generatePlan(message)}
              disabled={isGenerating}
              placeholder="Décrivez votre idée de projet..."
            />
          </div>
        </div>
      ) : viewMode === 'table' && currentPlan ? (
        /* Table view */
        <div className="flex-1 overflow-auto">
          <div className="px-6 py-8">
            <PlanTableView 
              plan={currentPlan} 
              onExecuteFeature={(feature) => executeFeatureFromMindmap(feature)}
            />
          </div>
        </div>
      ) : (
        /* Chat with messages and fixed input */
        <div className="flex-1 flex flex-col relative">
          {/* Messages */}
          <ScrollArea className="flex-1 px-6 pb-24">
            <div className="space-y-6 py-8 max-w-4xl mx-auto">
              {chatMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-4 ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl p-4 backdrop-blur-sm ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground border border-primary/20'
                        : 'bg-card text-card-foreground border border-border'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {message.role === 'assistant' ? (
                        <Bot className="h-5 w-5" />
                      ) : (
                        <User className="h-5 w-5" />
                      )}
                      <span className="text-sm opacity-70 font-medium">
                        {message.role === 'assistant' ? 'IA Assistant' : 'Vous'}
                      </span>
                      <span className="text-xs opacity-50">
                        {message.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="whitespace-pre-wrap">
                      {message.content}
                      
                      {/* Questions de clarification */}
                      {message.type === 'clarification_needed' && message.questions && (
                        <div className="mt-4 space-y-3">
                          <div className="flex items-center gap-2 text-orange-600">
                            <HelpCircle className="h-5 w-5" />
                            <span className="font-semibold">Questions pour préciser votre demande :</span>
                          </div>
                          <div className="space-y-2">
                            {message.questions.map((question, index) => (
                              <div key={index} className="flex items-start gap-2 p-2 bg-orange-50 rounded-lg">
                                <span className="text-orange-600 font-bold">{index + 1}.</span>
                                <span className="text-orange-800">{question}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Plan mindmap */}
                      {message.type === 'mindmap_plan' && message.plan && (
                        <PlanSummaryCard
                          title={message.plan.title || 'Plan sans titre'}
                          description={message.plan.description || 'Description non disponible'}
                          featuresCount={message.plan.mindmap_data?.branches?.features?.length || 0}
                          pagesCount={message.plan.mindmap_data?.branches?.pages?.length || 0}
                          onOpenMindmap={() => openMindmap(message.plan!)}
                          onExecutePlan={() => {
                            setCurrentPlan(message.plan!);
                            setShowExecutionDialog(true);
                            setIsExecuting(true);
                          }}
                        />
                      )}

                      {/* Plan standard (ancien format) */}
                      {(!message.type || message.type === 'standard') && message.plan && (
                        <div className="mt-4 space-y-3">
                          <div className="font-semibold text-lg border-b border-current/20 pb-2 flex items-center justify-between">
                            <span>📋 Plan généré: {message.plan.title}</span>
                            <AutoExecutionDialog
                              steps={message.plan.steps.map(step => ({
                                id: step.id,
                                titre: step.title,
                                description: step.description,
                                prompt: `Implémentez l'étape: ${step.title}. ${step.description}`,
                                status: step.status
                              }))}
                              onExecute={startExecution}
                              isExecuting={isExecuting}
                              currentStep={0}
                            >
                              <Button size="sm" variant="outline" onClick={() => setCurrentPlan(message.plan)}>
                                <Play className="h-3 w-3 mr-1" />
                                Exécuter
                              </Button>
                            </AutoExecutionDialog>
                          </div>
                          {message.plan.steps?.map((step, index) => (
                            <div key={step.id} className="flex items-start gap-3 p-3 rounded-lg bg-background/50">
                              <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                                {index + 1}
                              </div>
                              <div className="flex-1">
                                <h4 className="font-semibold">{step.title}</h4>
                                <p className="text-sm opacity-80 mt-1">{step.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {isGenerating && (
                <div className="flex gap-4 justify-start">
                  <div className="bg-card text-card-foreground backdrop-blur-sm border border-border rounded-2xl p-4">
                    <div className="flex items-center gap-3">
                      <Bot className="h-5 w-5" />
                      <span className="text-sm font-medium">IA Assistant génère votre plan...</span>
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
          
          {/* Gradient fade effect at bottom */}
          <div className="fixed bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background via-background/80 to-transparent pointer-events-none z-40" />
          
          {/* Fixed input at bottom */}
          <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-4xl px-6">
            <ClaudeChatInput
              onSendMessage={(message) => generatePlan(message)}
              disabled={isGenerating}
              placeholder="Continuez la discussion pour affiner votre plan..."
            />
          </div>
        </div>
      )}

      {/* Auto Executor Dialog */}
      {currentPlan && (
        <PlanAutoExecutor
          steps={(() => {
            // Organiser les étapes: prompt de démarrage -> features principales -> sous-features
            const allSteps = [];
            
            // 1. Ajouter le prompt de démarrage en premier si disponible
            if (currentPlan.plan_type === 'mindmap' && currentPlan.mindmap_data?.startupPrompt) {
              allSteps.push({
                id: 'startup',
                titre: 'Prompt de Démarrage',
                description: 'Initialisation et configuration du projet',
                prompt: currentPlan.mindmap_data.startupPrompt.initialSetup + '\n\n' + currentPlan.mindmap_data.startupPrompt.firstSteps,
                status: 'pending' as const
              });
            }
            
            // 2. Ajouter les features principales avec leurs prompts
            if (currentPlan.plan_type === 'mindmap' && currentPlan.mindmap_data?.features) {
              currentPlan.mindmap_data.features.forEach((feature: any) => {
                // Feature principale
                allSteps.push({
                  id: `feature-${feature.id}`,
                  titre: `Feature: ${feature.title}`,
                  description: feature.description,
                  prompt: feature.prompt || `Implémentez la feature: ${feature.title}. ${feature.description}`,
                  status: 'pending' as const
                });
                
                // Sous-features de cette feature
                if (feature.subFeatures && feature.subFeatures.length > 0) {
                  feature.subFeatures.forEach((subFeature: any) => {
                    allSteps.push({
                      id: `subfeature-${subFeature.id}`,
                      titre: `Sous-feature: ${subFeature.title}`,
                      description: subFeature.description,
                      prompt: subFeature.prompt || `Implémentez la sous-feature: ${subFeature.title}. ${subFeature.description}`,
                      status: 'pending' as const
                    });
                  });
                }
              });
            }
            
            // 3. Fallback pour les plans standards
            if (allSteps.length === 0) {
              return currentPlan.steps.map(step => ({
                id: step.id,
                titre: step.title,
                description: step.description,
                prompt: `Implémentez l'étape: ${step.title}. ${step.description}`,
                status: step.status
              }));
            }
            
            return allSteps;
          })()}
          isOpen={showExecutionDialog}
          onClose={() => {
            setShowExecutionDialog(false);
            setIsExecuting(false);
          }}
          mode={executionMode}
          onUpdateSteps={updatePlanSteps}
        />
      )}

      {/* Plan Mindmap Visualization */}
      {selectedMindmapData && (
        <PlanMindmapVisualization
          isOpen={showMindmapModal}
          onClose={() => {
            setShowMindmapModal(false);
            setSelectedMindmapData(null);
          }}
          data={selectedMindmapData.plan || selectedMindmapData}
          onExecuteFeature={executeFeatureFromMindmap}
        />
      )}
    </div>
  );
};

export default PlanGenerator;