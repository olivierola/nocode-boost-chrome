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

// Enhanced structure for better organization
interface Section {
  id: string;
  name: string;
  description: string;
  visualIdentity: string;
  layout: string;
  prompt: string;
}

interface Feature {
  id: string;
  name: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  prompt: string;
  subFeatures?: Feature[];
}

interface Page {
  id: string;
  name: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  features: Feature[];
  sections: Section[];
  prompt: string;
}

interface ProjectPlan {
  id: string;
  project_id: string;
  title?: string;
  description?: string;
  status?: 'draft' | 'validated' | 'executing' | 'completed';
  plan_type?: 'standard' | 'mindmap' | 'enhanced';
  mindmap_data?: any;
  // Enhanced structure
  pages?: Page[];
  steps: Array<{
    id: string;
    title: string;
    description: string;
    status: 'pending' | 'in_progress' | 'completed' | 'error';
  }>;
  // Legacy properties for plan data
  startupPrompt?: {
    initialSetup?: string;
    firstSteps?: string;
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
  const [currentViewMode, setCurrentViewMode] = useState<'chat' | 'table'>('chat');
  const [selectedPlanForTable, setSelectedPlanForTable] = useState<ProjectPlan | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasInitializedChat = useRef(false);
  
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
      hasInitializedChat.current = false;
      setChatMessages([]);
      setPlans([]);
      fetchPlans();
    } else {
      setChatMessages([]);
      setPlans([]);
    }
  }, [selectedProject]);

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
        title: "Error",
        description: "Could not load plans",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (!selectedProject || hasInitializedChat.current) {
      return;
    }

    if (plans.length > 0) {
      const historicalMessages: ChatMessage[] = plans
        .map(plan => {
          const messageContent =
            plan.plan_type === 'mindmap'
              ? `I have created a complete mindmap plan for your project! It includes ${
                  plan.mindmap_data?.features?.length || 0
                } main features, ${
                  plan.mindmap_data?.pages?.length || 0
                } pages, a market study and a visual identity. You can open the interactive mindmap to explore all the details.`
              : `I have generated a detailed plan for your project! The plan includes ${
                  plan.steps?.length || 0
                } main steps. You can continue to discuss it to refine it.`;

          return {
            id: plan.id,
            role: 'assistant' as const,
            content: messageContent,
            timestamp: new Date(plan.created_at),
            plan: plan,
            type: plan.plan_type === 'mindmap' ? 'mindmap_plan' as const : 'standard' as const,
          };
        })
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      setChatMessages(historicalMessages);
      hasInitializedChat.current = true;
    }
  }, [plans, selectedProject, (chatMessages || []).length]);

  const generatePlan = async (prompt: string) => {
    if (!selectedProject) {
      toast({
        title: "Error",
        description: "Please select a project",
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

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-plan', {
        body: {
          prompt,
          projectId: selectedProject.id
        }
      });
      console.log(data)
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
        return;
      }

      if (data.type === 'plan_generated') {
        // Enhanced plan with new structure
        const planForMessage: ProjectPlan = {
          id: data.planId,
          project_id: selectedProject.id,
          title: data.plan.title,
          description: data.plan.description,
          plan_type: 'enhanced',
          mindmap_data: data.plan,
          pages: data.plan.pages || [],
          steps: data.plan.features || [],
          startupPrompt: data.plan.startupPrompt,
          visualIdentity: data.plan.visualIdentity,
          status: 'draft',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const featuresCount = data.plan.pages?.reduce((acc: number, page: any) => acc + page.features.length, 0) || 0;
        const sectionsCount = data.plan.pages?.reduce((acc: number, page: any) => acc + page.sections.length, 0) || 0;

        const aiMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `I have created a comprehensive plan for your project! It includes ${data.plan.pages?.length || 0} pages, ${featuresCount} features, ${sectionsCount} sections, and detailed execution guidance. You can view it in the interactive table or mindmap.`,
          timestamp: new Date(),
          plan: planForMessage,
          type: 'mindmap_plan'
        };
        setChatMessages(prev => [...prev, aiMessage]);
        fetchPlans();
        return;
      }

      // Plan standard (fallback)
      const planForMessage: ProjectPlan = {
        id: data.id || Date.now().toString(),
        project_id: selectedProject.id,
        title: data.title || `Plan pour ${selectedProject.name}`,
        description: data.description || prompt,
        steps: data.steps || [],
        status: 'draft',
        plan_type: 'standard',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I have generated a detailed plan for your project! The plan includes ${data.steps?.length || 0} main steps. You can continue to discuss it to refine it.`,
        timestamp: new Date(),
        plan: planForMessage
      };
      setChatMessages(prev => [...prev, aiMessage]);

      toast({
        title: "Plan generated",
        description: "Your plan has been successfully created",
      });

      fetchPlans();
    } catch (error) {
      console.error('Erreur lors de la génération du plan:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: "Sorry, I encountered an error while generating the plan. Can you rephrase your request?",
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, errorMessage]);
      toast({
        title: "Error",
        description: "Could not generate the plan",
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
        title: "Plan deleted",
        description: "The plan has been successfully deleted",
      });

      fetchPlans();
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not delete the plan",
        variant: "destructive",
      });
    }
  };

  const startExecution = (mode: 'manual' | 'auto' | 'full-auto') => {
    setExecutionMode(mode);
    setIsExecuting(true);
    setShowExecutionDialog(true);
    
    toast({
      title: "Execution started",
      description: `mode ${mode === 'manual' ? 'manual' : mode === 'auto' ? 'automatic' : 'full-auto'} activated`,
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

  

  if (!selectedProject) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Target className="h-16 w-16 text-muted-foreground mx-auto" />
          <h2 className="text-2xl font-bold text-foreground">No project selected</h2>
          <p className="text-muted-foreground text-lg max-w-md">
            Please select a project from the project selector to get started
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
        title: "Startup prompt",
        description: plan.startupPrompt.initialSetup || "Initial project setup",
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
        title: "Visual Identity",
        description: "Creation of the complete visual identity",
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
    <div className="w-full h-full flex flex-col bg-background relative overflow-hidden">
      {/* Animated Background with Blue and Green Blur Effects */}
      
      
      
      
      
      
      {(chatMessages || []).length === 0 ? (
        <>
          <div className="absolute inset-0 w-full h-full">
            <RaycastBackground />
          </div>
          {/* Empty state with centered chat */}
          <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="text-center mb-8">
            <Target className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">Plan Generator - {selectedProject.name}</h2>
            <p className="text-muted-foreground text-lg max-w-md">
              Describe your idea and the AI will help you create a detailed step-by-step plan
            </p>
          </div>
          <ClaudeChatInput
            onSendMessage={(message) => generatePlan(message)}
            disabled={isGenerating}
            placeholder="Describe your project idea..."
          />
        </div>
        </>
      ) : (
        <>
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/4 left-1/3 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-1/4 right-1/3 w-64 h-64 bg-green-500/15 rounded-full blur-2xl animate-pulse delay-1000" />
            <div className="absolute top-2/3 left-1/4 w-48 h-48 bg-blue-400/8 rounded-full blur-xl animate-pulse delay-500" />
            <div className="absolute bottom-1/2 right-1/2 w-56 h-56 bg-green-400/12 rounded-full blur-2xl animate-pulse delay-700" />
          </div>
          {/* Chat with messages and fixed input */}
          <div className="flex-1 flex flex-col relative">
          {/* Messages */}
          <ScrollArea className="flex-1 px-6 pb-24">
            <div className="space-y-6 py-8 max-w-4xl mx-auto">
             
                {(chatMessages || []).map((message) => (
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
                        {message.role === 'assistant' ? 'AI Assistant' : 'You'}
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
                            <span className="font-semibold">Questions to clarify your request:</span>
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

                      {/* Enhanced plan */}
                      {message.type === 'mindmap_plan' && message.plan && (
                        <div className="mt-4 space-y-3">
                          <PlanSummaryCard
                            title={message.plan.title || 'Untitled plan'}
                            description={message.plan.description || 'Description not available'}
                            featuresCount={message.plan.pages?.reduce((acc, page) => acc + page.features?.length || 0, 0) || 0}
                            pagesCount={message.plan.pages?.length || 0}
                            onOpenMindmap={() => openMindmap(message.plan!)}
                            onExecutePlan={() => {
                              setCurrentPlan(message.plan!);
                              setShowExecutionDialog(true);
                              setIsExecuting(true);
                            }}
                          />
                          <div className="flex gap-2 mt-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedPlanForTable(message.plan!);
                                setCurrentViewMode('table');
                              }}
                            >
                              📋 Open Table View
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openMindmap(message.plan!)}
                            >
                              🗺️ Open Mindmap
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Plan standard (ancien format) */}
                      {(!message.type || message.type === 'standard') && message.plan && (
                        <div className="mt-4 space-y-3">
                          <div className="font-semibold text-lg border-b border-current/20 pb-2 flex items-center justify-between">
                            <span>📋 Generated plan: {message.plan.title}</span>
                            <AutoExecutionDialog
                              steps={message.plan.steps.map(step => ({
                                id: step.id,
                                titre: step.title,
                                description: step.description,
                                prompt: `Implement the step: ${step.title}. ${step.description}`,
                                status: step.status
                              }))}
                              onExecute={startExecution}
                              isExecuting={isExecuting}
                              currentStep={0}
                            >
                              <Button size="sm" variant="outline" onClick={() => setCurrentPlan(message.plan)}>
                                <Play className="h-3 w-3 mr-1" />
                                Execute
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
              )
              )}
              
              {isGenerating && (
                <div className="flex gap-4 justify-start">
                  <div className="bg-card text-card-foreground backdrop-blur-sm border border-border rounded-2xl p-4">
                    <div className="flex items-center gap-3">
                      <Bot className="h-5 w-5" />
                      <span className="text-sm font-medium">AI Assistant is generating your plan...</span>
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
              placeholder="Continue the discussion to refine your plan..."
            />
          </div>
        </div>
        </>
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
                titre: 'Startup Prompt',
                description: 'Project initialization and configuration',
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
                  prompt: feature.prompt || `Implement the feature: ${feature.title}. ${feature.description}`,
                  status: 'pending' as const
                });
                
                // Sous-features de cette feature
                if (feature.subFeatures && feature.subFeatures.length > 0) {
                  feature.subFeatures.forEach((subFeature: any) => {
                    allSteps.push({
                      id: `subfeature-${subFeature.id}`,
                      titre: `Sub-feature: ${subFeature.title}`,
                      description: subFeature.description,
                      prompt: subFeature.prompt || `Implement the sub-feature: ${subFeature.title}. ${subFeature.description}`,
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
                prompt: `Implement the step: ${step.title}. ${step.description}`,
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
          data={selectedMindmapData}
          onExecuteFeature={executeFeatureFromMindmap}
        />
      )}
    </div>
  );
};

export default PlanGenerator;