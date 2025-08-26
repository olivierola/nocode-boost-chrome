import { useState, useEffect, useRef } from 'react';
import { Bot, User, Target } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useProjectContext } from '@/hooks/useProjectContext';
import { ClaudeChatInput } from '@/components/ui/claude-style-ai-input';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ProjectPlan {
  id: string;
  project_id: string;
  title?: string;
  description?: string;
  status?: 'draft' | 'validated' | 'executing' | 'completed';
  steps: Array<{
    id: string;
    title: string;
    description: string;
    status: 'pending' | 'in_progress' | 'completed' | 'error';
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
}

const PlanGenerator = () => {
  const [plans, setPlans] = useState<ProjectPlan[]>([]);
  const [currentPlan, setCurrentPlan] = useState<ProjectPlan | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
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
    if (selectedProject && chatMessages.length === 0) {
      setChatMessages([{
        id: '1',
        role: 'assistant',
        content: `Bonjour ! Je vais vous aider à créer un plan détaillé pour votre projet "${selectedProject.name}". Décrivez-moi votre idée ou ce que vous souhaitez développer.`,
        timestamp: new Date()
      }]);
    }
  }, [selectedProject, chatMessages.length]);

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

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-plan', {
        body: {
          prompt,
          projectId: selectedProject.id
        }
      });

      if (error) throw error;

      const { data: savedPlan, error: saveError } = await supabase
        .from('plans')
        .insert([{
          project_id: selectedProject.id,
          title: data.title || `Plan pour ${selectedProject.name}`,
          description: data.description || prompt,
          steps: data.steps || [],
          status: 'draft'
        }])
        .select()
        .single();

      if (saveError) throw saveError;

      const planForMessage: ProjectPlan = {
        ...savedPlan,
        steps: data.steps || []
      } as ProjectPlan;

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `J'ai généré un plan détaillé pour votre projet ! Le plan comprend ${data.steps?.length || 0} étapes principales. Vous pouvez continuer à discuter pour l'affiner.`,
        timestamp: new Date(),
        plan: planForMessage
      };
      setChatMessages(prev => [...prev, aiMessage]);

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

  return (
    <div className="w-full h-full flex flex-col bg-background relative overflow-hidden">
      {/* Animated Background with Blue and Green Blur Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/3 w-64 h-64 bg-green-500/15 rounded-full blur-2xl animate-pulse delay-1000" />
        <div className="absolute top-2/3 left-1/4 w-48 h-48 bg-blue-400/8 rounded-full blur-xl animate-pulse delay-500" />
        <div className="absolute bottom-1/2 right-1/2 w-56 h-56 bg-green-400/12 rounded-full blur-2xl animate-pulse delay-700" />
      </div>
      
      {chatMessages.length === 0 ? (
        /* Empty state with centered chat */
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="text-center mb-8">
            <Target className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">Générateur de Plans - {selectedProject.name}</h2>
            <p className="text-muted-foreground text-lg max-w-md">
              Décrivez votre idée et l'IA vous aidera à créer un plan détaillé étape par étape
            </p>
          </div>
          <ClaudeChatInput
            onSendMessage={(message) => generatePlan(message)}
            disabled={isGenerating}
            placeholder="Décrivez votre idée de projet..."
          />
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
                      {message.plan && (
                        <div className="mt-4 space-y-3">
                          <div className="font-semibold text-lg border-b border-current/20 pb-2">
                            📋 Plan généré: {message.plan.title}
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
          <div className="fixed bottom-4 left-0 right-0 z-50 flex justify-center px-4">
            <div className="w-full max-w-4xl">
              <ClaudeChatInput
                onSendMessage={(message) => generatePlan(message)}
                disabled={isGenerating}
                placeholder="Continuez la discussion pour affiner votre plan..."
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlanGenerator;