import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useProjectContext } from '@/hooks/useProjectContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { SendHorizontal, Bot, User, Clock, Plus, BookOpen, Database, Shield, Play } from 'lucide-react';
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
  key: string;
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
        loadCurrentPlan()
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
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Vue quand il n'y a pas de plan
  if (!currentPlan) {
    return (
      <div className="min-h-screen relative overflow-hidden bg-white">
        {/* Background avec effets blur colorés */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-72 h-72 bg-primary/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-secondary/20 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-accent/20 rounded-full blur-3xl"></div>
        </div>

        {/* Contenu principal */}
        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-8">
          <div className="max-w-2xl w-full space-y-8">
            {/* Titre et description */}
            <div className="text-center space-y-4">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Générateur de Plans IA
              </h1>
              <p className="text-lg text-muted-foreground">
                Décrivez votre projet et laissez l'IA créer un plan détaillé pour vous guider dans sa réalisation
              </p>
            </div>

            {/* Interface de chat */}
            <Card className="backdrop-blur-sm bg-white/80 border-white/20 shadow-xl">
              <CardContent className="space-y-6 p-6">
                <ScrollArea className="h-96 w-full rounded-md border border-white/20 p-4 bg-white/50">
                  <div className="space-y-4">
                    {messages.length === 0 ? (
                      <div className="text-center text-muted-foreground py-8">
                        <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Commencez par décrire votre projet...</p>
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
                    className="flex-1 min-h-[60px] resize-none bg-white/60"
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
          </div>
        </div>
      </div>
    );
  }

  // Vue avec plan généré
  const planSections = getPlanSections(currentPlan.plan_data);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar verticale */}
      <div className="w-20 bg-card border-r shadow-sm flex flex-col items-center py-6 space-y-4">
        {planSections.map((section) => (
          <Button
            key={section.key}
            variant={selectedSection === section.key ? "default" : "ghost"}
            size="sm"
            onClick={() => setSelectedSection(selectedSection === section.key ? null : section.key)}
            className="w-12 h-12 p-0"
            title={section.title}
          >
            <section.icon className="h-5 w-5" />
          </Button>
        ))}
        <div className="border-t w-8 pt-4">
          <Button
            variant="default"
            size="sm"
            className="w-12 h-12 p-0 bg-green-600 hover:bg-green-700"
            title="Exécuter le plan"
          >
            <Play className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="flex-1 p-8">
        {selectedSection ? (
          <div className="max-w-4xl mx-auto">
            {(() => {
              const section = planSections.find(s => s.key === selectedSection);
              if (!section) return null;
              
              return (
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <section.icon className="h-6 w-6 text-primary" />
                      <h2 className="text-2xl font-bold">{section.title}</h2>
                    </div>
                    <div className="prose max-w-none">
                      {renderSectionContent(section.content)}
                    </div>
                  </CardContent>
                </Card>
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
    </div>
  );
};

export default PlanGenerator;