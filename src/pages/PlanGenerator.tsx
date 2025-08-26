import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Bot, User, Target, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useProjectContext } from '@/hooks/useProjectContext';
import { PromptInputBox } from '@/components/ui/ai-prompt-box';
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
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>Aucun projet sélectionné</CardTitle>
            <CardDescription>
              Veuillez d'abord sélectionner un projet depuis le sélecteur de projet pour commencer
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full h-screen flex flex-col bg-[radial-gradient(125%_125%_at_50%_101%,rgba(245,87,2,1)_10.5%,rgba(245,120,2,1)_16%,rgba(245,140,2,1)_17.5%,rgba(245,170,100,1)_25%,rgba(238,174,202,1)_40%,rgba(202,179,214,1)_65%,rgba(148,201,233,1)_100%)]">
      {/* Header */}
      <div className="flex items-center justify-between p-6">
        <h1 className="text-3xl font-bold text-white">Générateur de Plans - {selectedProject.name}</h1>
      </div>

      {/* Chat Interface */}
      <div className="flex-1 flex flex-col relative">
        {chatMessages.length === 0 ? (
          /* Empty state with centered input */
          <div className="flex-1 flex flex-col items-center justify-center px-6">
            <div className="text-center mb-8">
              <Target className="h-16 w-16 text-white/80 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Créez votre plan de projet</h2>
              <p className="text-white/80 text-lg max-w-md">
                Décrivez votre idée et l'IA vous aidera à créer un plan détaillé étape par étape
              </p>
            </div>
            <div className="w-full max-w-2xl">
              <PromptInputBox
                onSend={(message) => generatePlan(message)}
                isLoading={isGenerating}
                placeholder="Décrivez votre idée de projet..."
              />
            </div>
          </div>
        ) : (
          /* Chat with messages */
          <div className="flex-1 flex flex-col">
            {/* Messages */}
            <ScrollArea className="flex-1 px-6">
              <div className="space-y-6 py-6 max-w-4xl mx-auto">
                {chatMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-4 ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl p-4 ${
                        message.role === 'user'
                          ? 'bg-white/20 text-white backdrop-blur-sm border border-white/20'
                          : 'bg-white/90 text-gray-900 backdrop-blur-sm border border-white/30'
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
                              <div key={step.id} className="flex items-start gap-3 p-3 rounded-lg bg-black/10">
                                <div className="flex items-center justify-center w-7 h-7 rounded-full bg-current/20 text-sm font-bold">
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
                    <div className="bg-white/90 text-gray-900 backdrop-blur-sm border border-white/30 rounded-2xl p-4">
                      <div className="flex items-center gap-3">
                        <Bot className="h-5 w-5" />
                        <span className="text-sm font-medium">IA Assistant génère votre plan...</span>
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                          <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
            
            {/* Fixed input at bottom */}
            <div className="p-6">
              <div className="max-w-4xl mx-auto">
                <PromptInputBox
                  onSend={(message) => generatePlan(message)}
                  isLoading={isGenerating}
                  placeholder="Continuez la discussion pour affiner votre plan..."
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlanGenerator;