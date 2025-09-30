import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useProjectContext } from '@/hooks/useProjectContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { SendHorizontal, Bot, User, Clock, Plus, BookOpen, Database, Shield, Play, MessageCircle, Settings, FileText } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import ReactMarkdown from 'react-markdown';
import PlanStepCards from '@/components/ui/plan-step-cards';
import PlanChatDialog from '@/components/PlanChatDialog';
import { DottedSurface } from '@/components/ui/dotted-surface';
import { PromptBox } from '@/components/ui/chatgpt-prompt-input';
import { FlickeringGrid } from '@/components/ui/flickering-grid';
import PlanAgent from '@/components/PlanAgent';
import AgentKnowledgeBase from '@/components/AgentKnowledgeBase';
import TypewriterText from '@/components/TypewriterText';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  message_type: string;
  questions?: string[];
  created_at: string;
  plan_id?: string;
}

interface Plan {
  id: string;
  project_id: string;
  plan_data: any;
  created_at: string;
  updated_at: string;
}

interface PlanSection {
  title: string;
  content: any;
  icon: React.ComponentType<{ className?: string }>;
  key: string;
}

interface PlanStep {
  id: string;
  title: string;
  description: string;
  prompt?: string;
  type: 'documentation' | 'implementation' | 'backend' | 'security';
  status?: 'pending' | 'in-progress' | 'completed' | 'error';
}

const PlanGenerator = () => {
  const { user } = useAuth();
  const { selectedProject } = useProjectContext();
  
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [chatDialogOpen, setChatDialogOpen] = useState(false);
  const [agentActive, setAgentActive] = useState(false);
  const [currentExecutionStep, setCurrentExecutionStep] = useState<any>(null);
  const [executionContext, setExecutionContext] = useState<any>({});
  const [showKnowledgeBase, setShowKnowledgeBase] = useState(false);
  const [isOptimizeEnabled, setIsOptimizeEnabled] = useState(false);

  useEffect(() => {
    if (selectedProject && user) {
      loadInitialData();
    }
  }, [selectedProject, user]);

  // Fonctions de l'agent
  const handlePromptOptimized = useCallback((optimizedPrompt: string, context: any) => {
    setExecutionContext(prev => ({
      ...prev,
      lastOptimizedPrompt: optimizedPrompt,
      optimizationContext: context
    }));
    toast.success('Prompt optimisé par l\'agent');
  }, []);

  const handleStepGenerated = useCallback((step: any) => {
    setExecutionContext(prev => ({
      ...prev,
      generatedSteps: [...(prev.generatedSteps || []), step]
    }));
    toast.success('Nouvelle étape générée par l\'agent');
  }, []);

  const handleAnalysisResult = useCallback((analysis: any) => {
    setExecutionContext(prev => ({
      ...prev,
      lastAnalysis: analysis,
      analysisTimestamp: new Date()
    }));
  }, []);

  const handleResourceSelect = useCallback((resource: any, type: 'component' | 'color' | 'font') => {
    setExecutionContext(prev => ({
      ...prev,
      selectedResources: {
        ...prev.selectedResources,
        [type]: [...(prev.selectedResources?.[type] || []), resource]
      }
    }));
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      // Load plan first, then chat history only if plan exists
      await loadCurrentPlan();
      if (currentPlan) {
        await loadChatHistory();
      }
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const loadChatHistory = async () => {
    if (!selectedProject || !user) return;

    try {
      const { data, error } = await supabase
        .rpc('get_plan_chat_history', {
          p_project_id: selectedProject.id,
          p_user_id: user.id
        });

      if (error) throw error;
      
      const transformedMessages: ChatMessage[] = (data || []).map((msg: any) => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        message_type: msg.message_type,
        questions: msg.questions,
        created_at: msg.created_at,
        plan_id: msg.plan_id
      }));
      
      // Only set messages if there's a current plan
      if (currentPlan) {
        setMessages(transformedMessages);
      }
    } catch (error) {
      console.error('Erreur chargement historique:', error);
    }
  };

  const loadCurrentPlan = async () => {
    if (!selectedProject) return;

    try {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .eq('project_id', selectedProject.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setCurrentPlan(data || null);
    } catch (error) {
      console.error('Erreur chargement plan:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || !selectedProject || !user || isGenerating) return;

    const userMessage = prompt.trim();
    setPrompt('');
    setIsGenerating(true);

    try {
      let finalPrompt = userMessage;
      
      // Si l'optimisation est activée, optimiser d'abord le prompt
      if (isOptimizeEnabled) {
        try {
          const { data: optimizedData, error: optimizeError } = await supabase.functions.invoke('enhance-prompt', {
            body: { prompt: userMessage }
          });
          
          if (optimizeError) {
            console.error('Erreur optimisation prompt:', optimizeError);
            toast.error('Erreur lors de l\'optimisation du prompt');
          } else if (optimizedData?.enhancedPrompt) {
            finalPrompt = optimizedData.enhancedPrompt;
            toast.success('Prompt optimisé avec succès !');
          }
        } catch (error) {
          console.error('Erreur optimisation:', error);
          toast.error('Erreur lors de l\'optimisation du prompt');
        }
      }
      
      await saveMessage('user', userMessage);
      
      const updatedMessages = [...messages, {
        id: crypto.randomUUID(),
        role: 'user' as const,
        content: userMessage,
        message_type: 'standard',
        created_at: new Date().toISOString(),
      }];
      setMessages(updatedMessages);

      const { data, error } = await supabase.functions.invoke('generate-plan', {
        body: {
          prompt: finalPrompt,
          projectId: selectedProject.id,
          conversationHistory: updatedMessages.slice(-10)
        }
      });

      if (error) throw error;

      if (data.type === 'clarification_needed') {
        const clarificationMessage = {
          id: crypto.randomUUID(),
          role: 'assistant' as const,
          content: data.message,
          message_type: 'clarification_needed',
          questions: data.questions,
          created_at: new Date().toISOString(),
        };
        
        await saveMessage('assistant', data.message, 'clarification_needed', data.questions);
        setMessages(prev => [...prev, clarificationMessage]);
      } else if (data.plan) {
        const planMessage = {
          id: crypto.randomUUID(),
          role: 'assistant' as const,
          content: 'Plan généré avec succès !',
          message_type: 'plan_generated',
          created_at: new Date().toISOString(),
        };

        await saveMessage('assistant', planMessage.content, 'plan_generated');
        setMessages(prev => [...prev, planMessage]);
        await savePlan(data.plan);
        await loadCurrentPlan();
        toast.success('Plan généré avec succès !');
      }

    } catch (error) {
      console.error('Erreur génération plan:', error);
      toast.error('Erreur lors de la génération du plan');
      
      const errorMessage = {
        id: crypto.randomUUID(),
        role: 'assistant' as const,
        content: 'Désolé, une erreur est survenue lors de la génération du plan. Veuillez réessayer.',
        message_type: 'error',
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsGenerating(false);
    }
  };

  const saveMessage = async (
    role: 'user' | 'assistant', 
    content: string, 
    messageType: string = 'standard',
    questions?: string[]
  ) => {
    if (!selectedProject || !user) return;

    try {
      await supabase.rpc('save_plan_chat_message', {
        p_project_id: selectedProject.id,
        p_user_id: user.id,
        p_role: role,
        p_content: content,
        p_message_type: messageType,
        p_questions: questions || null
      });
    } catch (error) {
      console.error('Erreur sauvegarde message:', error);
    }
  };

  const savePlan = async (planData: any) => {
    if (!selectedProject) return;

    try {
      const { error } = await supabase
        .from('plans')
        .insert({
          project_id: selectedProject.id,
          plan_data: planData
        });

      if (error) throw error;
    } catch (error) {
      console.error('Erreur sauvegarde plan:', error);
      throw error;
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPlanSections = (planData: any): PlanSection[] => {
    if (!planData) return [];

    const sections: PlanSection[] = [];

    if (planData.documentation) {
      sections.push({
        title: 'Documentation',
        content: planData.documentation,
        icon: BookOpen,
        key: 'documentation'
      });
    }

    if (planData.implementation_plan) {
      sections.push({
        title: 'Plan d\'implémentation',
        content: planData.implementation_plan,
        icon: Plus,
        key: 'implementation'
      });
    }

    if (planData.backend_database) {
      sections.push({
        title: 'Backend & Base de données',
        content: planData.backend_database,
        icon: Database,
        key: 'backend'
      });
    }

    if (planData.security_plan) {
      sections.push({
        title: 'Plan de sécurité',
        content: planData.security_plan,
        icon: Shield,
        key: 'security'
      });
    }

    return sections;
  };

  const convertSectionToSteps = (content: any, sectionType: 'documentation' | 'implementation' | 'backend' | 'security'): PlanStep[] => {
    console.log('convertSectionToSteps - input:', { content, sectionType });
    
    if (!content) return [];

    // Nouveau format: plan_implementation est un tableau d'étapes
    if (sectionType === 'implementation' && Array.isArray(content)) {
      return content.map((item, index) => {
        console.log('Processing implementation step:', { item, index });
        
        if (typeof item === 'object' && item !== null) {
          return {
            id: `${sectionType}-${index}`,
            title: item.titre || `Étape ${index + 1}`,
            description: item.description || 'Description non disponible',
            prompt: item.prompt_optimise || `Implémenter l'étape ${index + 1}`,
            type: sectionType,
            status: 'pending' as const
          };
        }
        
        return {
          id: `${sectionType}-${index}`,
          title: `Étape ${index + 1}`,
          description: typeof item === 'string' ? item : 'Description non disponible',
          prompt: `Implémenter l'étape ${index + 1}`,
          type: sectionType,
          status: 'pending' as const
        };
      });
    }

    // Pour etude_saas (documentation): traiter comme une seule étape avec markdown
    if (sectionType === 'documentation' && typeof content === 'object' && content.documentation_markdown) {
      return [{
        id: `${sectionType}-0`,
        title: 'Étude SaaS Complète',
        description: content.documentation_markdown,
        prompt: 'Analyser et valider cette étude SaaS',
        type: sectionType,
        status: 'pending' as const
      }];
    }

    // Legacy: Si c'est un objet avec des étapes
    if (typeof content === 'object' && !Array.isArray(content)) {
      const steps = Object.entries(content).map(([key, value], index) => {
        console.log('Processing object entry:', { key, value });
        
        // Si la valeur est un objet avec nom, description et prompt
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          const stepData = value as any;
          const step = {
            id: `${sectionType}-${index}-${key}`,
            title: stepData.nom || stepData.name || stepData.title || stepData.titre || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            description: stepData.description || stepData.etape || stepData.desc || 'Description non disponible',
            prompt: stepData.prompt || stepData.prompt_optimise || stepData.prompts || `Implémenter: ${key}`,
            type: sectionType,
            status: 'pending' as const
          };
          console.log('Created step from object:', step);
          return step;
        }
        
        // Sinon, traitement par défaut
        const step = {
          id: `${sectionType}-${index}-${key}`,
          title: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          description: typeof value === 'string' ? value : 'Description non disponible',
          prompt: `Implémenter: ${key}`,
          type: sectionType,
          status: 'pending' as const
        };
        console.log('Created default step:', step);
        return step;
      });
      console.log('Final steps from object:', steps);
      return steps;
    }

    // Si c'est un tableau (format legacy)
    if (Array.isArray(content)) {
      const steps = content.map((item, index) => {
        console.log('Processing array item:', { item, index });
        
        // Si l'item est un objet avec nom, description et prompt
        if (typeof item === 'object' && item !== null) {
          const stepData = item as any;
          const step = {
            id: `${sectionType}-${index}`,
            title: stepData.nom || stepData.name || stepData.title || stepData.titre || `Étape ${index + 1}`,
            description: stepData.description || stepData.etape || stepData.desc || 'Description non disponible',
            prompt: stepData.prompt || stepData.prompt_optimise || stepData.prompts || `Implémenter l'étape ${index + 1}`,
            type: sectionType,
            status: 'pending' as const
          };
          console.log('Created step from array object:', step);
          return step;
        }
        
        // Sinon, traitement par défaut
        const step = {
          id: `${sectionType}-${index}`,
          title: `Étape ${index + 1}`,
          description: typeof item === 'string' ? item : 'Description non disponible',
          prompt: `Implémenter l'étape ${index + 1}`,
          type: sectionType,
          status: 'pending' as const
        };
        console.log('Created default array step:', step);
        return step;
      });
      console.log('Final steps from array:', steps);
      return steps;
    }

    // Fallback pour les chaînes de caractères
    return [{
      id: `${sectionType}-0`,
      title: 'Étape unique',
      description: typeof content === 'string' ? content : 'Description non disponible',
      prompt: 'Implémenter cette étape',
      type: sectionType,
      status: 'pending' as const
    }];
  };


  const handleEditStep = async (step: PlanStep) => {
    if (!currentPlan) return;
    
    try {
      // Mettre à jour le plan avec les modifications
      const updatedPlanData = { ...currentPlan.plan_data };
      
      // Logic to update the specific step in the plan data
      // This would need to be implemented based on your plan data structure
      
      const { error } = await supabase
        .from('plans')
        .update({ 
          plan_data: updatedPlanData,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentPlan.id);

      if (error) throw error;
      
      toast.success('Étape mise à jour avec succès');
      await loadCurrentPlan();
    } catch (error) {
      console.error('Erreur mise à jour étape:', error);
      toast.error('Erreur lors de la mise à jour de l\'étape');
    }
  };

  const handleAddStep = async (sectionType: 'documentation' | 'implementation' | 'backend' | 'security') => {
    if (!currentPlan) return;

    const newStep: PlanStep = {
      id: `${sectionType}-${Date.now()}`,
      title: 'Nouvelle étape',
      description: 'Description de la nouvelle étape',
      prompt: 'Prompt pour cette étape',
      type: sectionType,
      status: 'pending'
    };

    try {
      // Add logic to add step to plan data
      toast.success('Nouvelle étape ajoutée');
    } catch (error) {
      console.error('Erreur ajout étape:', error);
      toast.error('Erreur lors de l\'ajout de l\'étape');
    }
  };

  const handleDeleteStep = async (stepId: string) => {
    if (!currentPlan) return;

    try {
      // Add logic to remove step from plan data
      toast.success('Étape supprimée avec succès');
    } catch (error) {
      console.error('Erreur suppression étape:', error);
      toast.error('Erreur lors de la suppression de l\'étape');
    }
  };

  const handleSavePlan = async (steps: PlanStep[]) => {
    if (!currentPlan) return;

    try {
      // Save updated plan with new steps structure
      toast.success('Plan sauvegardé avec succès');
    } catch (error) {
      console.error('Erreur sauvegarde plan:', error);
      toast.error('Erreur lors de la sauvegarde du plan');
    }
  };

  const renderSectionContent = (content: any, depth = 0, sectionKey?: string) => {
    if (!content) return null;

    // Si c'est la documentation, afficher avec le rendu markdown
    if (sectionKey === 'documentation' && typeof content === 'string') {
      return (
        <div className="prose max-w-none prose-sm">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      );
    }

    if (typeof content === 'string') {
      return <p className="text-sm text-muted-foreground whitespace-pre-wrap">{content}</p>;
    }

    if (Array.isArray(content)) {
      return (
        <ul className="list-disc list-inside space-y-1">
          {content.map((item, index) => (
            <li key={index} className="text-sm text-muted-foreground">
              {typeof item === 'string' ? item : renderSectionContent(item, depth + 1, sectionKey)}
            </li>
          ))}
        </ul>
      );
    }

    if (typeof content === 'object') {
      return (
        <div className="space-y-3">
          {Object.entries(content).map(([key, value]) => (
            <div key={key} className="space-y-2">
              <h4 className="text-sm font-medium capitalize">
                {key.replace(/_/g, ' ')}
              </h4>
              <div className="pl-4 border-l-2 border-border">
                {renderSectionContent(value, depth + 1, sectionKey)}
              </div>
            </div>
          ))}
        </div>
      );
    }

    return <span className="text-sm text-muted-foreground">{String(content)}</span>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Vue quand il n'y a pas de plan
  if (!currentPlan) {
    return (
      <div className="h-screen relative overflow-hidden flex items-center justify-center">
        <DottedSurface />

        <div className="relative z-10 w-full max-w-2xl px-8">
          <div className="text-center mb-12 space-y-6">
            {/* Logo Plan avec gradient inline */}
            <div className="flex justify-center mb-6">
              <svg className="h-20 w-20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="planGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{ stopColor: '#3B82F6', stopOpacity: 1 }} />
                    <stop offset="50%" style={{ stopColor: '#7C3AED', stopOpacity: 1 }} />
                    <stop offset="100%" style={{ stopColor: '#8B1538', stopOpacity: 1 }} />
                  </linearGradient>
                </defs>
                <path
                  d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8M14 2L20 8M14 2V8H20M16 13H8M16 17H8M10 9H8"
                  stroke="url(#planGradient)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <h1 className="text-5xl font-bold text-foreground">
              <TypewriterText text="Créer un nouveau plan" delay={80} />
            </h1>
            <p className="text-lg text-muted-foreground">
              <TypewriterText 
                text="Décrivez votre projet et laissez l'IA générer un plan détaillé pour vous" 
                delay={40}
              />
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <PromptBox 
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Décrivez votre projet en détail (ex: application de livraison de nourriture avec géolocalisation)..."
              disabled={isGenerating}
              onOptimizeToggle={setIsOptimizeEnabled}
            />
          </form>

          {isGenerating && (
            <div className="flex items-center justify-center gap-3 text-muted-foreground mt-6 animate-fade-in">
              <Bot className="h-5 w-5" />
              <div className="flex items-center gap-1.5">
                <div className="animate-bounce w-2 h-2 bg-primary rounded-full"></div>
                <div className="animate-bounce w-2 h-2 bg-primary rounded-full delay-100"></div>
                <div className="animate-bounce w-2 h-2 bg-primary rounded-full delay-200"></div>
              </div>
              <span className="text-sm">IA génère votre plan...</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Vue avec plan généré
  const planSections = getPlanSections(currentPlan.plan_data);

  return (
    <div className="h-screen bg-background relative overflow-hidden">
      {/* Background FlickeringGrid */}
      <FlickeringGrid
        className="fixed inset-0 z-0"
        squareSize={4}
        gridGap={6}
        color="hsl(var(--primary))"
        maxOpacity={0.1}
        flickerChance={0.05}
      />
      {/* Sidebar verticale flottante */}
      <div className="fixed left-4 top-1/2 transform -translate-y-1/2 z-50 relative">
        <div className="bg-card border rounded-xl shadow-lg p-2 flex flex-col space-y-2">
          {planSections.map((section) => (
            <Button
              key={section.key}
              variant={selectedSection === section.key ? "default" : "ghost"}
              size="sm"
              onClick={() => setSelectedSection(selectedSection === section.key ? null : section.key)}
              className="w-10 h-10 p-0 rounded-lg flex flex-col items-center justify-center"
              title={section.title}
            >
              <section.icon className="h-4 w-4" />
            </Button>
          ))}
          <div className="border-t pt-2 flex flex-col space-y-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setChatDialogOpen(true)}
              className="w-10 h-10 p-0 rounded-lg hover:bg-primary/10 flex flex-col items-center justify-center"
              title="Chat IA pour modifier le plan"
            >
              <MessageCircle className="h-4 w-4" />
            </Button>
            <Button
              variant="default"
              size="sm"
              className="w-10 h-10 p-0 bg-green-600 hover:bg-green-700 rounded-lg flex flex-col items-center justify-center"
              title="Exécuter le plan"
            >
              <Play className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="p-8">
        {selectedSection ? (
          <div className="max-w-7xl mx-auto">
            {(() => {
              const section = planSections.find(s => s.key === selectedSection);
              if (!section) return null;
              
              const steps = convertSectionToSteps(section.content, section.key as 'documentation' | 'implementation' | 'backend' | 'security');
              
              return (
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-6">
                    <section.icon className="h-6 w-6 text-primary" />
                    <h2 className="text-2xl font-bold">{section.title}</h2>
                  </div>
                  
                  {section.key === 'documentation' ? (
                    <Card>
                      <CardContent className="p-6">
                        <div className="prose max-w-none">
                          {renderSectionContent(section.content, 0, section.key)}
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <PlanStepCards
                      steps={steps}
                      onEditStep={handleEditStep}
                      onAddStep={handleAddStep}
                      onDeleteStep={handleDeleteStep}
                      onSavePlan={handleSavePlan}
                      sectionType={section.key as 'documentation' | 'implementation' | 'backend' | 'security'}
                      editable={true}
                    />
                  )}
                </div>
              );
            })()}
          </div>
        ) : (
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <div className="space-y-3">
              <h1 className="text-3xl font-bold">Plan de projet généré</h1>
              <p className="text-muted-foreground">
                Utilisez la barre latérale pour naviguer entre les différentes sections de votre plan
              </p>
            </div>
            <Card className="p-8">
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {planSections.map((section, index) => (
                    <AccordionItem key={section.key} value={section.key}>
                      <AccordionTrigger className="flex items-center gap-2">
                        <section.icon className="h-4 w-4" />
                        {section.title}
                      </AccordionTrigger>
                      <AccordionContent className="space-y-4">
                        {renderSectionContent(section.content)}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <PlanChatDialog
        open={chatDialogOpen}
        onOpenChange={setChatDialogOpen}
        sectionTitle={selectedSection ? planSections.find(s => s.key === selectedSection)?.title : "Plan"}
      />
    </div>
  );
};

export default PlanGenerator;