import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Wand2, Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Component {
  id: string;
  nom: string;
  description: string | null;
  prompt: string | null;
}

interface PromptEnhancerProps {
  value: string;
  onChange: (value: string) => void;
  onSend?: (prompt: string) => void;
}

const PromptEnhancer = ({ value, onChange, onSend }: PromptEnhancerProps) => {
  const [showComponentModal, setShowComponentModal] = useState(false);
  const [components, setComponents] = useState<Component[]>([]);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchComponents = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('components')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setComponents(data || []);
    } catch (error: any) {
      console.error('Error fetching components:', error);
    }
  };

  const detectComponentTrigger = (text: string, cursorPosition: number) => {
    const beforeCursor = text.substring(0, cursorPosition);
    const lastTrigger = beforeCursor.lastIndexOf('::');
    
    if (lastTrigger !== -1 && cursorPosition - lastTrigger <= 2) {
      setShowComponentModal(true);
    }
  };

  const insertComponentTag = (component: Component) => {
    const tag = `{component:${component.nom}}`;
    const textarea = textareaRef.current;
    
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const currentValue = value;
      
      // Remplacer "::" par le tag
      const beforeTrigger = currentValue.substring(0, start - 2);
      const afterTrigger = currentValue.substring(end);
      const newValue = beforeTrigger + tag + afterTrigger;
      
      onChange(newValue);
      
      // Remettre le focus et la position du curseur
      setTimeout(() => {
        textarea.focus();
        const newPosition = beforeTrigger.length + tag.length;
        textarea.setSelectionRange(newPosition, newPosition);
      }, 0);
    }
    
    setShowComponentModal(false);
    
    toast({
      title: "Composant inséré",
      description: `Le tag "${tag}" a été ajouté au prompt`,
    });
  };

  const transformPrompt = async (promptText: string) => {
    let transformedPrompt = promptText;
    
    // Check if there are component tags to replace
    const componentRegex = /\{component:([^}]+)\}/g;
    const matches = [...promptText.matchAll(componentRegex)];
    
    if (matches.length > 0) {
      try {
        // Use edge function for component tag replacement
        const { data, error } = await supabase.functions.invoke('enhance-prompt', {
          body: {
            prompt: promptText,
            mode: 'replace'
          }
        });

        if (error) throw error;
        if (data?.enhancedPrompt) {
          transformedPrompt = data.enhancedPrompt;
        }
      } catch (error) {
        console.error('Error transforming prompt:', error);
        // Fallback to local replacement
        for (const match of matches) {
          const componentName = match[1];
          const component = components.find(c => c.nom === componentName);
          
          if (component && component.prompt) {
            transformedPrompt = transformedPrompt.replace(match[0], component.prompt);
          }
        }
      }
    }
    
    return transformedPrompt;
  };

  const enhancePrompt = async () => {
    if (!value.trim()) return;

    setIsEnhancing(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('enhance-prompt', {
        body: {
          prompt: value,
          mode: 'enhance'
        }
      });

      if (error) throw error;

      if (data?.enhancedPrompt) {
        onChange(data.enhancedPrompt);
        
        toast({
          title: "Prompt amélioré",
          description: "Votre prompt a été optimisé par l'IA",
        });

        // Log activity
        if ((window as any).logActivity) {
          (window as any).logActivity('prompt_enhanced', {
            originalLength: value.length,
            enhancedLength: data.enhancedPrompt.length
          });
        }
      }
    } catch (error) {
      console.error('Error enhancing prompt:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'améliorer le prompt",
        variant: "destructive",
      });
    } finally {
      setIsEnhancing(false);
    }
  };

  const copyPrompt = async () => {
    const finalPrompt = await transformPrompt(value);
    
    try {
      await navigator.clipboard.writeText(finalPrompt);
      setCopiedText(finalPrompt);
      
      toast({
        title: "Prompt copié",
        description: "Le prompt final a été copié dans le presse-papier",
      });

      setTimeout(() => setCopiedText(null), 2000);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de copier le prompt",
        variant: "destructive",
      });
    }
  };

  const handleSend = async () => {
    const finalPrompt = await transformPrompt(value);
    if (onSend) {
      onSend(finalPrompt);
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPosition = e.target.selectionStart;
    
    onChange(newValue);
    detectComponentTrigger(newValue, cursorPosition);
  };

  const handleAddComponentTag = (event: CustomEvent) => {
    const { tag } = event.detail;
    onChange(value + ' ' + tag);
  };

  useEffect(() => {
    fetchComponents();
  }, [user]);

  useEffect(() => {
    // Écouter l'événement depuis Components
    window.addEventListener('addComponentTag', handleAddComponentTag as EventListener);
    
    return () => {
      window.removeEventListener('addComponentTag', handleAddComponentTag as EventListener);
    };
  }, [value]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Prompt Enhancer
          </CardTitle>
          <CardDescription className="text-xs">
            Tapez "::" pour insérer un composant • Utilisez des tags {`{component:nom}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            ref={textareaRef}
            placeholder="Votre prompt ici... Tapez :: pour insérer un composant"
            value={value}
            onChange={handleTextareaChange}
            className="min-h-[120px] text-sm"
          />
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={enhancePrompt}
              disabled={isEnhancing || !value.trim()}
            >
              <Wand2 className="h-3 w-3 mr-1" />
              {isEnhancing ? 'Amélioration...' : 'Améliorer prompt'}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={copyPrompt}
              disabled={!value.trim()}
            >
              {copiedText ? (
                <Check className="h-3 w-3 mr-1" />
              ) : (
                <Copy className="h-3 w-3 mr-1" />
              )}
              {copiedText ? 'Copié!' : 'Copier final'}
            </Button>
            
            {onSend && (
              <Button
                size="sm"
                onClick={handleSend}
                disabled={!value.trim()}
                className="ml-auto"
              >
                Envoyer
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Component Selection Modal */}
      <Dialog open={showComponentModal} onOpenChange={setShowComponentModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">Insérer un composant</DialogTitle>
            <DialogDescription className="text-xs">
              Sélectionnez un composant à insérer dans votre prompt
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {components.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                Aucun composant disponible
              </p>
            ) : (
              components.map((component) => (
                <Card 
                  key={component.id} 
                  className="cursor-pointer hover:bg-muted transition-colors"
                  onClick={() => insertComponentTag(component)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-medium truncate">
                          {component.nom}
                        </h4>
                        {component.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                            {component.description}
                          </p>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs ml-2">
                        {`{component:${component.nom}}`}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PromptEnhancer;