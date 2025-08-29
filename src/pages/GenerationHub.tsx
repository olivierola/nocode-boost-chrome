import { useState, useEffect, useRef } from 'react';
import { Bot, User, Target, Palette, FileText, Crown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useProjectContext } from '@/hooks/useProjectContext';
import { useSubscription } from '@/hooks/useSubscription';
import { ClaudeChatInput } from '@/components/ui/claude-style-ai-input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import SubscriptionDialog from '@/components/SubscriptionDialog';
import UsageLimitWarning from '@/components/UsageLimitWarning';

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

interface VisualIdentity {
  id: string;
  project_id: string;
  couleurs: Array<{
    nom: string;
    hex: string;
    usage: string;
  }>;
  polices: Array<{
    nom: string;
    type: string;
    usage: string;
  }>;
  styles: {
    theme: string;
    bordures: string;
    ombres: string;
    espacement: string;
  };
  created_at: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  plan?: ProjectPlan;
  visualIdentity?: VisualIdentity;
}

type GenerationType = 'plan' | 'visual_identity';

const GenerationHub = () => {
  const [activeType, setActiveType] = useState<GenerationType>('plan');
  const [isGenerating, setIsGenerating] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [showSubscriptionDialog, setShowSubscriptionDialog] = useState(false);
  const [usageData, setUsageData] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { user } = useAuth();
  const { selectedProject } = useProjectContext();
  const { subscription, checkUsageLimit } = useSubscription();
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
        content: `Bonjour ! Je vais vous aider avec votre projet "${selectedProject.name}". Choisissez le type de génération que vous souhaitez effectuer et décrivez-moi votre besoin.`,
        timestamp: new Date()
      }]);
    }
  }, [selectedProject, chatMessages.length]);

  // Check usage limit when switching types
  useEffect(() => {
    const checkUsage = async () => {
      if (user && selectedProject) {
        const data = await checkUsageLimit(activeType === 'plan' ? 'plan_generation' : 'visual_identity');
        setUsageData(data);
      }
    };
    checkUsage();
  }, [activeType, user, selectedProject, checkUsageLimit]);

  // Charger l'historique de conversation au démarrage
  useEffect(() => {
    const loadConversationHistory = async () => {
      if (!selectedProject || !user) return;
      
      try {
        // Utiliser une simple requête SQL pour récupérer l'historique temporairement
        const { data: history, error } = await supabase
          .from('conversation_history')
          .select('*')
          .eq('project_id', selectedProject.id)
          .eq('user_id', user.id)
          .eq('conversation_type', activeType)
          .order('created_at', { ascending: true });

        if (error) {
          console.log('Pas d\'historique trouvé, création d\'un nouveau chat');
          setChatMessages([{
            id: '1',
            role: 'assistant',
            content: `Bonjour ! Je vais vous aider avec votre projet "${selectedProject.name}". Choisissez le type de génération que vous souhaitez effectuer et décrivez-moi votre besoin.`,
            timestamp: new Date()
          }]);
          return;
        }

        if (history && history.length > 0) {
          const formattedMessages = history.map((msg: any) => ({
            id: msg.id,
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
            timestamp: new Date(msg.created_at),
            plan: msg.plan_data ? JSON.parse(msg.plan_data) : undefined,
            visualIdentity: msg.visual_identity_data ? JSON.parse(msg.visual_identity_data) : undefined
          }));
          setChatMessages(formattedMessages);
        } else {
          // Message de bienvenue si pas d'historique
          setChatMessages([{
            id: '1',
            role: 'assistant',
            content: `Bonjour ! Je vais vous aider avec votre projet "${selectedProject.name}". Choisissez le type de génération que vous souhaitez effectuer et décrivez-moi votre besoin.`,
            timestamp: new Date()
          }]);
        }
      } catch (error) {
        console.error('Erreur lors du chargement de l\'historique:', error);
        // Message de bienvenue par défaut en cas d'erreur
        setChatMessages([{
          id: '1',
          role: 'assistant',
          content: `Bonjour ! Je vais vous aider avec votre projet "${selectedProject.name}". Choisissez le type de génération que vous souhaitez effectuer et décrivez-moi votre besoin.`,
          timestamp: new Date()
        }]);
      }
    };

    loadConversationHistory();
  }, [selectedProject, user, activeType]);

  const saveToConversationHistory = async (message: ChatMessage) => {
    if (!selectedProject || !user) return;

    try {
      await supabase
        .from('conversation_history')
        .insert({
          project_id: selectedProject.id,
          user_id: user.id,
          conversation_type: activeType,
          role: message.role,
          content: message.content,
          plan_data: message.plan ? JSON.stringify(message.plan) : null,
          visual_identity_data: message.visualIdentity ? JSON.stringify(message.visualIdentity) : null
        });
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de l\'historique:', error);
    }
  };

  const generateContent = async (prompt: string) => {
    if (!selectedProject) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un projet",
        variant: "destructive",
      });
      return;
    }

    // Check usage limits
    const usageCheck = await checkUsageLimit(activeType === 'plan' ? 'plan_generation' : 'visual_identity');
    if (!usageCheck?.can_proceed) {
      setShowSubscriptionDialog(true);
      toast({
        title: "Limite atteinte",
        description: "Vous avez atteint votre limite mensuelle. Mettez à niveau votre plan pour continuer.",
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
    await saveToConversationHistory(userMessage);

    setIsGenerating(true);
    try {
      const functionName = activeType === 'plan' ? 'generate-plan' : 'generate-visual-identity';
      
      // Préparer l'historique de conversation pour le contexte
      const conversationHistory = chatMessages.slice(-10).map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const { data, error } = await supabase.functions.invoke(functionName, {
        body: {
          prompt,
          projectId: selectedProject.id,
          conversationHistory
        }
      });

      if (error) {
        // Gérer les demandes de clarification
        if (error.message && typeof error.message === 'object' && error.message.type === 'clarification_needed') {
          const clarificationMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: `${error.message.message}\n\n${error.message.questions.map((q: string, i: number) => `${i + 1}. ${q}`).join('\n')}`,
            timestamp: new Date()
          };
          setChatMessages(prev => [...prev, clarificationMessage]);
          await saveToConversationHistory(clarificationMessage);
          return;
        }
        throw error;
      }

      if (activeType === 'plan') {
        const { data: savedPlan, error: saveError } = await supabase
          .from('plans')
          .insert([{
            project_id: selectedProject.id,
            title: data.title || `Plan pour ${selectedProject.name}`,
            description: data.description || prompt,
            etapes: data.branches?.features || [],
            mindmap_data: data,
            plan_type: 'mindmap',
            status: 'draft'
          }])
          .select()
          .single();

        if (saveError) throw saveError;

        const aiMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `J'ai généré un plan mindmap ultra-détaillé pour votre projet ! Le plan comprend ${data.branches?.features?.length || 0} fonctionnalités principales et une structure complète avec étude de marché, documentation technique, planning, équipe, et identité visuelle.`,
          timestamp: new Date(),
          plan: {
            ...savedPlan,
            steps: data.branches?.features || []
          } as ProjectPlan
        };
        setChatMessages(prev => [...prev, aiMessage]);
        await saveToConversationHistory(aiMessage);
      } else {
        const aiMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `J'ai créé une identité visuelle complète et détaillée pour votre projet ! Elle comprend une palette de couleurs professionnelle, des polices sélectionnées, un design system complet avec spécifications techniques.`,
          timestamp: new Date(),
          visualIdentity: data as VisualIdentity
        };
        setChatMessages(prev => [...prev, aiMessage]);
        await saveToConversationHistory(aiMessage);
      }

      toast({
        title: "Génération réussie",
        description: `Votre ${activeType === 'plan' ? 'plan mindmap' : 'identité visuelle'} a été créé avec succès`,
      });

      // Refresh usage data
      const newUsageData = await checkUsageLimit(activeType === 'plan' ? 'plan_generation' : 'visual_identity');
      setUsageData(newUsageData);

    } catch (error) {
      console.error('Erreur lors de la génération:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: `Désolé, j'ai rencontré une erreur lors de la génération. ${error instanceof Error ? error.message : 'Veuillez réessayer.'}`,
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, errorMessage]);
      await saveToConversationHistory(errorMessage);
      
      toast({
        title: "Erreur",
        description: "Impossible de générer le contenu",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

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
      {/* Animated Background */}
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
            <h2 className="text-2xl font-bold text-foreground mb-2">Hub de Génération - {selectedProject.name}</h2>
            <p className="text-muted-foreground text-lg max-w-md mb-6">
              Générez des plans détaillés ou des identités visuelles pour votre projet
            </p>
            
            {/* Type Selection */}
            <div className="flex gap-4 mb-6">
              <Button
                variant={activeType === 'plan' ? 'default' : 'outline'}
                onClick={() => setActiveType('plan')}
                className="flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                Génération de Plan
              </Button>
              <Button
                variant={activeType === 'visual_identity' ? 'default' : 'outline'}
                onClick={() => setActiveType('visual_identity')}
                className="flex items-center gap-2"
              >
                <Palette className="h-4 w-4" />
                Identité Visuelle
              </Button>
            </div>
          </div>
          
          {/* Usage Warning */}
          {usageData && (
            <div className="w-full max-w-2xl mb-4">
              <UsageLimitWarning
                actionType={activeType === 'plan' ? 'plan_generation' : 'visual_identity'}
                currentUsage={usageData.current_usage}
                limit={usageData.limit}
                onUpgrade={() => setShowSubscriptionDialog(true)}
              />
            </div>
          )}
          
          <ClaudeChatInput
            onSendMessage={generateContent}
            disabled={isGenerating}
            placeholder={`Décrivez votre besoin pour ${activeType === 'plan' ? 'la génération de plan' : 'l\'identité visuelle'}...`}
          />
        </div>
      ) : (
        /* Chat with messages and fixed input */
        <div className="flex-1 flex flex-col relative">
          {/* Type Selection Bar */}
          <div className="flex justify-center gap-4 p-4 border-b bg-background/80 backdrop-blur-sm">
            <Button
              variant={activeType === 'plan' ? 'default' : 'outline'}
              onClick={() => setActiveType('plan')}
              className="flex items-center gap-2"
              size="sm"
            >
              <FileText className="h-4 w-4" />
              Plan
            </Button>
            <Button
              variant={activeType === 'visual_identity' ? 'default' : 'outline'}
              onClick={() => setActiveType('visual_identity')}
              className="flex items-center gap-2"
              size="sm"
            >
              <Palette className="h-4 w-4" />
              Identité Visuelle
            </Button>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 px-6 pb-24">
            <div className="space-y-6 py-8 max-w-4xl mx-auto">
              {/* Usage Warning */}
              {usageData && (
                <UsageLimitWarning
                  actionType={activeType === 'plan' ? 'plan_generation' : 'visual_identity'}
                  currentUsage={usageData.current_usage}
                  limit={usageData.limit}
                  onUpgrade={() => setShowSubscriptionDialog(true)}
                />
              )}
              
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
                      
                      {/* Plan Display */}
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
                      
                      {/* Visual Identity Display */}
                      {message.visualIdentity && (
                        <div className="mt-4 space-y-4">
                          <div className="font-semibold text-lg border-b border-current/20 pb-2">
                            🎨 Identité visuelle générée
                          </div>
                          
                          {/* Colors */}
                          <div>
                            <h4 className="font-semibold mb-2">Palette de couleurs</h4>
                            <div className="grid grid-cols-2 gap-2">
                              {message.visualIdentity.couleurs?.map((color, index) => (
                                <div key={index} className="flex items-center gap-2 p-2 rounded bg-background/50">
                                  <div 
                                    className="w-6 h-6 rounded border"
                                    style={{ backgroundColor: color.hex }}
                                  />
                                  <div>
                                    <div className="font-medium text-sm">{color.nom}</div>
                                    <div className="text-xs opacity-60">{color.hex}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          {/* Fonts */}
                          <div>
                            <h4 className="font-semibold mb-2">Polices</h4>
                            <div className="space-y-2">
                              {message.visualIdentity.polices?.map((font, index) => (
                                <div key={index} className="p-2 rounded bg-background/50">
                                  <div className="font-medium">{font.nom}</div>
                                  <div className="text-sm opacity-60">{font.type} - {font.usage}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          {/* Styles */}
                          <div>
                            <h4 className="font-semibold mb-2">Style général</h4>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>Thème: {message.visualIdentity.styles?.theme}</div>
                              <div>Bordures: {message.visualIdentity.styles?.bordures}</div>
                              <div>Ombres: {message.visualIdentity.styles?.ombres}</div>
                              <div>Espacement: {message.visualIdentity.styles?.espacement}</div>
                            </div>
                          </div>
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
                      <span className="text-sm font-medium">IA Assistant génère votre contenu...</span>
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
              onSendMessage={generateContent}
              disabled={isGenerating}
              placeholder={`Continuez la discussion pour ${activeType === 'plan' ? 'affiner votre plan' : 'ajuster votre identité visuelle'}...`}
            />
          </div>
        </div>
      )}
      
      <SubscriptionDialog 
        open={showSubscriptionDialog} 
        onOpenChange={setShowSubscriptionDialog} 
      />
    </div>
  );
};

export default GenerationHub;