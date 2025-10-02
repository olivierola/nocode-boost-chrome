import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useProjectContext } from '@/hooks/useProjectContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { SendHorizontal, Bot, User, Clock, Plus, BookOpen, Database, Shield, Play, MessageCircle, Settings, FileText, Sparkles, ListTodo, MessageSquare, FileBarChart, Database as DatabaseIcon } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { TimelineStepper } from '@/components/ui/timeline-stepper';
import { ProgressReportView } from '@/components/ProgressReportView';
import { KnowledgeBaseManager } from '@/components/KnowledgeBaseManager';
import { Label } from '@/components/ui/label';

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
  const [activeTab, setActiveTab] = useState<'plan' | 'chat' | 'rapport' | 'knowledge'>('plan');
  const [chatTarget, setChatTarget] = useState<'documentation' | 'steps'>('documentation');
  const [agentActive, setAgentActive] = useState(false);
  const [currentExecutionStep, setCurrentExecutionStep] = useState<any>(null);
  const [executionContext, setExecutionContext] = useState<any>({});
  const [showKnowledgeBase, setShowKnowledgeBase] = useState(false);
  const [isOptimizeEnabled, setIsOptimizeEnabled] = useState(false);
  const [projectDocumentation, setProjectDocumentation] = useState<any>(null);
  const [isGeneratingDocs, setIsGeneratingDocs] = useState(false);

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
        await loadProjectDocumentation();
      }
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const loadProjectDocumentation = async () => {
    if (!selectedProject) return;

    try {
      const { data, error } = await supabase
        .from('project_documentation')
        .select('*')
        .eq('project_id', selectedProject.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setProjectDocumentation(data || null);
    } catch (error) {
      console.error('Erreur chargement documentation:', error);
    }
  };

  const generateProjectDocumentation = async () => {
    if (!selectedProject || !currentPlan) return;

    setIsGeneratingDocs(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-project-documentation', {
        body: {
          projectId: selectedProject.id,
          projectName: selectedProject.name,
          projectDescription: selectedProject.description,
          planData: currentPlan.plan_data
        }
      });

      if (error) throw error;

      setProjectDocumentation(data.documentation);
      toast.success('Documentation générée avec succès !');
    } catch (error) {
      console.error('Erreur génération documentation:', error);
      toast.error('Erreur lors de la génération de la documentation');
    } finally {
      setIsGeneratingDocs(false);
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
          prompt: userMessage,
          projectId: selectedProject.id,
          conversationHistory: updatedMessages.slice(-10),
          optimizePrompt: isOptimizeEnabled
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

          <form onSubmit={handleSubmit} className="w-full">
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

  // Convert plan sections to timeline steps
  const timelineSteps = planSections.flatMap((section) => {
    const steps = convertSectionToSteps(section.content, section.key as 'documentation' | 'implementation' | 'backend' | 'security');
    return steps.map((step, index) => ({
      id: step.id,
      title: step.title,
      description: step.description,
      prompt: step.prompt || '',
      status: index === 0 ? 'current' as const : 'upcoming' as const
    }));
  });

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
      
      {/* Sidebar flottante simplifiée */}
      <div className="fixed left-4 top-1/2 transform -translate-y-1/2 z-50">
        <div className="bg-card border rounded-xl shadow-lg p-2 flex flex-col space-y-2">
          <Button
            variant={activeTab === 'plan' ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab('plan')}
            className="w-10 h-10 p-0 rounded-lg flex flex-col items-center justify-center"
            title="Plan"
          >
            <ListTodo className="h-4 w-4" />
          </Button>
          <Button
            variant={activeTab === 'chat' ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab('chat')}
            className="w-10 h-10 p-0 rounded-lg flex flex-col items-center justify-center"
            title="Chat"
          >
            <MessageSquare className="h-4 w-4" />
          </Button>
          <Button
            variant={activeTab === 'rapport' ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab('rapport')}
            className="w-10 h-10 p-0 rounded-lg flex flex-col items-center justify-center"
            title="Rapport"
          >
            <FileBarChart className="h-4 w-4" />
          </Button>
          <Button
            variant={activeTab === 'knowledge' ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab('knowledge')}
            className="w-10 h-10 p-0 rounded-lg flex flex-col items-center justify-center"
            title="Ressources"
          >
            <DatabaseIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="p-8">
        {activeTab === 'plan' ? (
          <div className="max-w-6xl mx-auto space-y-8">
            {/* Documentation Card */}
            {projectDocumentation ? (
              <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-2xl mb-2 flex items-center gap-2">
                        <FileText className="w-6 h-6" />
                        {projectDocumentation.title}
                      </CardTitle>
                      <CardDescription className="text-base">{projectDocumentation.description}</CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={generateProjectDocumentation}
                      disabled={isGeneratingDocs}
                      className="ml-4"
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Régénérer
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="prose prose-sm md:prose-base max-w-none dark:prose-invert prose-headings:text-foreground prose-p:text-foreground/90 prose-strong:text-foreground prose-a:text-primary">
                    <ReactMarkdown>{projectDocumentation.documentation_markdown}</ReactMarkdown>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-dashed border-2">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileText className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Aucune documentation générée</h3>
                  <p className="text-muted-foreground mb-4 text-center">
                    Générez une documentation complète pour votre projet
                  </p>
                  <Button
                    onClick={generateProjectDocumentation}
                    disabled={isGeneratingDocs}
                    className="bg-gradient-to-r from-primary to-primary/80"
                  >
                    {isGeneratingDocs ? (
                      <>
                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                        Génération en cours...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Générer la documentation
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Timeline Stepper */}
            <div className="mt-8">
              <TimelineStepper
                steps={timelineSteps}
                onPromptChange={(stepId, newPrompt) => {
                  console.log('Prompt changed for step:', stepId, newPrompt);
                }}
                isExecuting={false}
                onExecute={() => {
                  toast.info('Exécution de la timeline à venir...');
                }}
              />
            </div>
          </div>
        ) : activeTab === 'rapport' ? (
          <div className="max-w-6xl mx-auto">
            <ProgressReportView projectId={selectedProject?.id || ''} planId={currentPlan?.id} />
          </div>
        ) : activeTab === 'knowledge' ? (
          <div className="max-w-6xl mx-auto">
            <KnowledgeBaseManager projectId={selectedProject?.id || ''} />
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <MessageCircle className="h-5 w-5 text-primary" />
                    Chat IA - Modifier le plan
                  </CardTitle>
                  <Select value={chatTarget} onValueChange={(value) => setChatTarget(value as 'documentation' | 'steps')}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="documentation">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Documentation
                        </div>
                      </SelectItem>
                      <SelectItem value="steps">
                        <div className="flex items-center gap-2">
                          <ListTodo className="h-4 w-4" />
                          Étapes
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px] w-full rounded-md border p-4 mb-4">
                  <div className="space-y-4">
                    {messages.length === 0 ? (
                      <div className="text-center text-muted-foreground py-8">
                        <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Posez votre question pour modifier {chatTarget === 'documentation' ? 'la documentation' : 'les étapes'}...</p>
                      </div>
                    ) : (
                      messages.map((message) => (
                        <div key={message.id} className="space-y-2">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {message.role === 'user' ? (
                              <User className="h-4 w-4" />
                            ) : (
                              <Bot className="h-4 w-4" />
                            )}
                            <span className="capitalize">{message.role}</span>
                            <span>
                              <Clock className="h-3 w-3 inline mr-1" />
                              {formatTime(message.created_at)}
                            </span>
                          </div>
                          <div className={`p-3 rounded-lg ${
                            message.role === 'user' 
                              ? 'bg-primary text-primary-foreground ml-12' 
                              : 'bg-muted mr-12'
                          }`}>
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          </div>
                        </div>
                      ))
                    )}
                    {isGenerating && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Bot className="h-4 w-4" />
                        <div className="flex items-center gap-1">
                          <div className="animate-bounce w-2 h-2 bg-primary rounded-full"></div>
                          <div className="animate-bounce w-2 h-2 bg-primary rounded-full delay-100"></div>
                          <div className="animate-bounce w-2 h-2 bg-primary rounded-full delay-200"></div>
                        </div>
                        <span className="text-sm">IA réfléchit...</span>
                      </div>
                    )}
                  </div>
                </ScrollArea>

                <form onSubmit={handleSubmit} className="mt-4">
                  <PromptBox 
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder={`Décrivez les modifications pour ${chatTarget === 'documentation' ? 'la documentation' : 'les étapes'}...`}
                    disabled={isGenerating}
                    onOptimizeToggle={setIsOptimizeEnabled}
                  />
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlanGenerator;