import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessageCircle, Send, Bot, User } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface PlanChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sectionTitle?: string;
}

const PlanChatDialog: React.FC<PlanChatDialogProps> = ({
  open,
  onOpenChange,
  sectionTitle = "Plan"
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: prompt.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setPrompt('');
    setIsLoading(true);

    try {
      // Simulation d'une réponse de l'IA
      setTimeout(() => {
        const aiMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `Je vais vous aider à modifier la section "${sectionTitle}". Pouvez-vous me donner plus de détails sur les changements que vous souhaitez apporter ?`,
          timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, aiMessage]);
        setIsLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error);
      toast.error('Erreur lors de l\'envoi du message');
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            Chat IA - Modifier le plan
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col flex-1 gap-4">
          <ScrollArea className="flex-1 h-[400px] w-full rounded-md border p-4">
            <div className="space-y-4">
              {messages.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Posez votre question pour modifier le plan...</p>
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
                      <span>{new Date(message.timestamp).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}</span>
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
              {isLoading && (
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
              placeholder="Décrivez les modifications que vous souhaitez apporter à cette section..."
              className="flex-1 min-h-[60px] resize-none"
              disabled={isLoading}
            />
            <Button
              type="submit"
              disabled={!prompt.trim() || isLoading}
              className="px-6"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PlanChatDialog;