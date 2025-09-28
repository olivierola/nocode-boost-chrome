import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useProjectContext } from '@/hooks/useProjectContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { SendHorizontal, MessageSquare, Bot, User, Clock, Plus, BookOpen, Database, Shield } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

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
}

const PlanGenerator = () => {
  const { user } = useAuth();
  const { selectedProject } = useProjectContext();
  
  // États principaux
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);

  // Charger les données initiales
  useEffect(() => {
    if (selectedProject && user) {
      loadInitialData();
    }
  }, [selectedProject, user]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadChatHistory(),
        loadPlans()
      ]);
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
      
      // Transformer les données pour correspondre à l'interface ChatMessage
      const transformedMessages: ChatMessage[] = (data || []).map((msg: any) => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        message_type: msg.message_type,
        questions: msg.questions,
        created_at: msg.created_at,
        plan_id: msg.plan_id
      }));
      
      setMessages(transformedMessages);
    } catch (error) {
      console.error('Erreur chargement historique:', error);
    }
  };

  const loadPlans = async () => {
    if (!selectedProject) return;

    try {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .eq('project_id', selectedProject.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPlans(data || []);
      
      // Sélectionner le plan le plus récent
      if (data && data.length > 0) {
        setSelectedPlan(data[0]);
      }
    } catch (error) {
      console.error('Erreur chargement plans:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || !selectedProject || !user || isGenerating) return;

    const userMessage = prompt.trim();
    setPrompt('');
    setIsGenerating(true);

    try {
      // Sauvegarder le message utilisateur
      await saveMessage('user', userMessage);
      
      // Actualiser l'historique pour inclure le nouveau message
      const updatedMessages = [...messages, {
        id: crypto.randomUUID(),
        role: 'user' as const,
        content: userMessage,
        message_type: 'standard',
        created_at: new Date().toISOString(),
      }];
      setMessages(updatedMessages);

      // Appeler l'edge function
      const { data, error } = await supabase.functions.invoke('generate-plan', {
        body: {
          prompt: userMessage,
          projectId: selectedProject.id,
          conversationHistory: updatedMessages.slice(-10)
        }
      });

      if (error) throw error;

      // Traiter la réponse
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
          content: 'Plan généré avec succès ! Vous pouvez le consulter dans l\'onglet "Plans".',
          message_type: 'plan_generated',
          created_at: new Date().toISOString(),
        };

        await saveMessage('assistant', planMessage.content, 'plan_generated');
        setMessages(prev => [...prev, planMessage]);
        await savePlan(data.plan);
        await loadPlans();
        toast.success('Plan généré avec succès !');
      } else {
        throw new Error('Réponse inattendue du serveur');
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

  const renderPlanSections = (planData: any): PlanSection[] => {
    if (!planData) return [];

    const sections: PlanSection[] = [];

    if (planData.documentation) {
      sections.push({
        title: 'Documentation',
        content: planData.documentation,
        icon: BookOpen
      });
    }

    if (planData.implementation_plan) {
      sections.push({
        title: 'Plan d\'implémentation',
        content: planData.implementation_plan,
        icon: Plus
      });
    }

    if (planData.backend_database) {
      sections.push({
        title: 'Backend & Base de données',
        content: planData.backend_database,
        icon: Database
      });
    }

    if (planData.security_plan) {
      sections.push({
        title: 'Plan de sécurité',
        content: planData.security_plan,
        icon: Shield
      });
    }

    return sections;
  };

  const renderSectionContent = (content: any, depth = 0) => {
    if (!content) return null;

    if (typeof content === 'string') {
      return <p className="text-sm text-muted-foreground whitespace-pre-wrap">{content}</p>;
    }

    if (Array.isArray(content)) {
      return (
        <ul className="list-disc list-inside space-y-1">
          {content.map((item, index) => (
            <li key={index} className="text-sm text-muted-foreground">
              {typeof item === 'string' ? item : renderSectionContent(item, depth + 1)}
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
                {renderSectionContent(value, depth + 1)}
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
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Générateur de Plans IA</h1>
          <p className="text-muted-foreground">
            Créez des plans de projet détaillés avec l'aide de l'IA
          </p>
        </div>
        <Badge variant="secondary">
          {plans.length} plan{plans.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      <Tabs defaultValue="chat" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="chat" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Chat
          </TabsTrigger>
          <TabsTrigger value="plans" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Plans générés
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                Assistant IA
              </CardTitle>
              <CardDescription>
                Décrivez votre projet pour générer un plan détaillé
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ScrollArea className="h-96 w-full rounded-md border p-4">
                <div className="space-y-4">
                  {messages.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Commencez une conversation pour générer votre plan</p>
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
                          <Clock className="h-3 w-3" />
                          <span>{formatTime(message.created_at)}</span>
                          {message.message_type !== 'standard' && (
                            <Badge variant="outline" className="text-xs">
                              {message.message_type}
                            </Badge>
                          )}
                        </div>
                        <div className={`p-3 rounded-lg ${
                          message.role === 'user' 
                            ? 'bg-primary text-primary-foreground ml-12' 
                            : 'bg-muted mr-12'
                        }`}>
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          {message.questions && message.questions.length > 0 && (
                            <div className="mt-3 space-y-2">
                              <p className="text-xs font-medium">Questions à répondre :</p>
                              <ul className="space-y-1">
                                {message.questions.map((question, index) => (
                                  <li key={index} className="text-xs p-2 bg-background/50 rounded border-l-2 border-primary">
                                    {question}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
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

              <form onSubmit={handleSubmit} className="flex gap-2">
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Décrivez votre projet (ex: application de livraison de nourriture)..."
                  className="flex-1 min-h-[60px] resize-none"
                  disabled={isGenerating}
                />
                <Button
                  type="submit"
                  disabled={!prompt.trim() || isGenerating}
                  className="px-6"
                >
                  <SendHorizontal className="h-4 w-4" />
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plans" className="space-y-6">
          {plans.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Aucun plan généré</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Utilisez le chat pour générer votre premier plan de projet
                </p>
                <Button 
                  onClick={() => {
                    const chatTab = document.querySelector('[value="chat"]') as HTMLElement;
                    if (chatTab) chatTab.click();
                  }}
                  variant="outline"
                >
                  Commencer dans le chat
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6">
              <div className="flex gap-2 flex-wrap">
                {plans.map((plan) => (
                  <Button
                    key={plan.id}
                    variant={selectedPlan?.id === plan.id ? "default" : "outline"}
                    onClick={() => setSelectedPlan(plan)}
                    className="text-xs"
                  >
                    Plan du {new Date(plan.created_at).toLocaleDateString('fr-FR')}
                  </Button>
                ))}
              </div>

              {selectedPlan && (
                <Card>
                  <CardHeader>
                    <CardTitle>
                      Plan généré le {new Date(selectedPlan.created_at).toLocaleDateString('fr-FR')}
                    </CardTitle>
                    <CardDescription>
                      Dernière mise à jour: {new Date(selectedPlan.updated_at).toLocaleString('fr-FR')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Accordion type="single" collapsible className="w-full">
                      {renderPlanSections(selectedPlan.plan_data).map((section, index) => (
                        <AccordionItem key={index} value={`section-${index}`}>
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
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PlanGenerator;