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

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `J'ai généré un plan détaillé pour votre projet ! Le plan comprend ${data.steps?.length || 0} étapes principales. Vous pouvez le consulter ci-dessous et continuer à discuter pour l'affiner.`,
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, aiMessage]);

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
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-primary">Générateur de Plans</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Chat Interface */}
        <Card className="lg:sticky lg:top-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Discussion avec l'IA - {selectedProject.name}
            </CardTitle>
            <CardDescription>
              Discutez avec l'IA pour créer et affiner votre plan de projet
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="flex flex-col h-[500px]">
              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {chatMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex gap-3 ${
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-3 ${
                          message.role === 'user'
                            ? 'bg-primary text-primary-foreground ml-auto'
                            : 'bg-muted'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {message.role === 'assistant' ? (
                            <Bot className="h-4 w-4" />
                          ) : (
                            <User className="h-4 w-4" />
                          )}
                          <span className="text-xs opacity-70">
                            {message.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      </div>
                    </div>
                  ))}
                  {isGenerating && (
                    <div className="flex gap-3 justify-start">
                      <div className="bg-muted rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          <Bot className="h-4 w-4" />
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
              
              {/* Input */}
              <div className="p-4 border-t">
                <PromptInputBox
                  onSend={(message) => generatePlan(message)}
                  isLoading={isGenerating}
                  placeholder="Décrivez votre idée de projet ou posez des questions..."
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Plans existants */}
        <div className="space-y-6">
          {plans.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Plans existants</CardTitle>
                <CardDescription>
                  Vos plans générés pour ce projet
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {plans.map((plan) => (
                    <div
                      key={plan.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => setCurrentPlan(plan)}
                    >
                      <div className="flex-1">
                        <h3 className="font-medium">{plan.title}</h3>
                        <p className="text-sm text-muted-foreground">{plan.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant={plan.status === 'validated' ? 'default' : 'secondary'}>
                            {plan.status === 'validated' ? 'Validé' : 'Brouillon'}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {plan.steps?.length || 0} étapes
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          deletePlan(plan.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Plan actuel */}
          {currentPlan && (
            <Card>
              <CardHeader>
                <CardTitle>{currentPlan.title}</CardTitle>
                <CardDescription>{currentPlan.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {currentPlan.steps?.map((step, index) => (
                    <div key={step.id} className="flex items-start gap-3 p-3 border rounded-lg">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm">
                        {step.status === 'completed' ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : (
                          index + 1
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">{step.title}</h4>
                        <p className="text-sm text-muted-foreground">{step.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlanGenerator;