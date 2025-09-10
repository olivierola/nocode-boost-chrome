import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { MessageCircle, Send, ThumbsUp, ThumbsDown, RotateCcw, CheckCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface PlanValidationChatProps {
  planId: string;
  plan: any;
  onValidate: () => void;
  onRegenerate: () => void;
  isValidated: boolean;
}

const PlanValidationChat = ({ planId, plan, onValidate, onRegenerate, isValidated }: PlanValidationChatProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showValidationDialog, setShowValidationDialog] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // Initialiser la conversation
  useEffect(() => {
    if (plan && messages.length === 0) {
      const welcomeMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Voici le plan généré pour votre projet. Il contient ${plan.etapes?.length || 0} étapes principales. 

Que pensez-vous de ce plan ? Y a-t-il des étapes que vous souhaitez modifier, ajouter ou supprimer ?

Utilisez ce chat pour discuter des ajustements avant de valider définitivement le plan.`,
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
    }
  }, [plan]);

  const sendMessage = useCallback(async () => {
    if (!newMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: newMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setNewMessage('');
    setIsLoading(true);

    try {
      // Simuler une réponse IA (remplacer par votre logique)
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Générer une réponse contextuelle simple
      let response = '';
      const lowerMessage = newMessage.toLowerCase();
      
      if (lowerMessage.includes('ajouter') || lowerMessage.includes('ajout')) {
        response = "Je comprends que vous souhaitez ajouter des éléments au plan. Pourriez-vous préciser quelles étapes ou sous-étapes vous aimeriez ajouter ? Je peux vous aider à les intégrer de manière cohérente.";
      } else if (lowerMessage.includes('supprimer') || lowerMessage.includes('enlever')) {
        response = "Vous voulez retirer certaines étapes ? C'est une bonne approche pour simplifier le plan. Quelles étapes vous semblent moins prioritaires ou redondantes ?";
      } else if (lowerMessage.includes('modifier') || lowerMessage.includes('changer')) {
        response = "Parfait, nous pouvons modifier les étapes existantes. Quelle étape souhaitez-vous ajuster et comment ?";
      } else if (lowerMessage.includes('valider') || lowerMessage.includes('ok') || lowerMessage.includes('bien')) {
        response = "Excellent ! Si le plan vous convient, vous pouvez le valider. Une fois validé, vous pourrez commencer l'exécution automatique des étapes.";
      } else {
        response = "Merci pour votre retour. N'hésitez pas à me dire spécifiquement ce que vous souhaitez ajuster dans ce plan. Je peux vous aider à l'améliorer avant la validation finale.";
      }

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer le message",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [newMessage, isLoading, toast]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleValidation = async () => {
    try {
      // Mettre à jour le statut du plan
      const { error } = await supabase
        .from('plans')
        .update({ 
          status: 'validated',
          updated_at: new Date().toISOString()
        })
        .eq('id', planId);

      if (error) throw error;

      // Log activity
      if ((window as any).logActivity) {
        (window as any).logActivity('plan_validated', {
          planId,
          stepsCount: plan.etapes?.length || 0
        });
      }

      onValidate();
      setShowValidationDialog(false);
      
      toast({
        title: "Plan validé",
        description: "Le plan a été validé et peut maintenant être exécuté",
      });
    } catch (error) {
      console.error('Error validating plan:', error);
      toast({
        title: "Erreur",
        description: "Impossible de valider le plan",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <MessageCircle className="h-4 w-4" />
          Chat de validation
          {isValidated && (
            <Badge variant="default" className="text-xs">
              <CheckCircle className="h-3 w-3 mr-1" />
              Validé
            </Badge>
          )}
        </CardTitle>
        <CardDescription className="text-xs">
          Discutez du plan avant de le valider définitivement
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        {/* Messages */}
        <ScrollArea className="flex-1 px-4">
          <div className="space-y-3 pb-4">
            {(messages || []).map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 text-xs ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {message.timestamp.toLocaleTimeString('fr-FR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted text-muted-foreground rounded-lg px-3 py-2 text-xs">
                  <Loader2 className="h-3 w-3 animate-spin" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="border-t border-border p-4 space-y-3">
          <div className="flex gap-2">
            <Textarea
              placeholder="Partagez vos commentaires sur le plan..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1 min-h-[60px] text-xs resize-none"
              disabled={isLoading}
            />
            <Button
              size="sm"
              onClick={sendMessage}
              disabled={!newMessage.trim() || isLoading}
              className="self-end"
            >
              <Send className="h-3 w-3" />
            </Button>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {!isValidated ? (
              <>
                <Dialog open={showValidationDialog} onOpenChange={setShowValidationDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="flex-1">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Valider le plan
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Valider le plan</DialogTitle>
                      <DialogDescription>
                        Êtes-vous sûr de vouloir valider ce plan ? Une fois validé, vous pourrez l'exécuter automatiquement.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="flex gap-2">
                      <Button onClick={handleValidation} className="flex-1">
                        Oui, valider
                      </Button>
                      <Button variant="outline" onClick={() => setShowValidationDialog(false)}>
                        Annuler
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
                
                <Button size="sm" variant="outline" onClick={onRegenerate}>
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Regénérer
                </Button>
              </>
            ) : (
              <div className="flex-1 text-center">
                <p className="text-xs text-muted-foreground">
                  Plan validé - Prêt pour l'exécution
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PlanValidationChat;