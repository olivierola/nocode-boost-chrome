import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Sparkles, Wand2, Copy, Check, Palette, FileText, Image, Type, Component } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useProjectContext } from '@/hooks/useProjectContext';

interface ComponentItem {
  id: string;
  nom: string;
  description: string | null;
  prompt: string | null;
}

interface FileItem {
  id: string;
  nom: string;
  type: string;
  url: string;
}

interface ColorItem {
  name: string;
  value: string;
  category: 'primary' | 'secondary' | 'accent';
}

interface FontItem {
  name: string;
  value: string;
  category: 'heading' | 'body' | 'mono';
}

interface EnhancedPromptEnhancerProps {
  value: string;
  onChange: (value: string) => void;
  onSend?: (prompt: string) => void;
}

const EnhancedPromptEnhancer = ({ value, onChange, onSend }: EnhancedPromptEnhancerProps) => {
  const [showInsertModal, setShowInsertModal] = useState(false);
  const [components, setComponents] = useState<ComponentItem[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [colors, setColors] = useState<ColorItem[]>([]);
  const [fonts, setFonts] = useState<FontItem[]>([]);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('components');
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { user } = useAuth();
  const { selectedProject } = useProjectContext();
  const { toast } = useToast();

  // Couleurs prédéfinies du design system
  const defaultColors: ColorItem[] = [
    { name: 'Primary', value: 'hsl(var(--primary))', category: 'primary' },
    { name: 'Secondary', value: 'hsl(var(--secondary))', category: 'secondary' },
    { name: 'Accent', value: 'hsl(var(--accent))', category: 'accent' },
    { name: 'Muted', value: 'hsl(var(--muted))', category: 'secondary' },
    { name: 'Destructive', value: 'hsl(var(--destructive))', category: 'accent' },
  ];

  // Polices prédéfinies
  const defaultFonts: FontItem[] = [
    { name: 'Inter', value: 'Inter, sans-serif', category: 'body' },
    { name: 'Geist Sans', value: 'Geist Sans, sans-serif', category: 'heading' },
    { name: 'JetBrains Mono', value: 'JetBrains Mono, monospace', category: 'mono' },
  ];

  const fetchData = async () => {
    if (!user) return;

    try {
      // Fetch components
      const { data: componentsData, error: componentsError } = await supabase
        .from('components')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (componentsError) throw componentsError;
      setComponents(componentsData || []);

      // Fetch files
      const { data: filesData, error: filesError } = await supabase
        .from('files')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (filesError) throw filesError;
      setFiles(filesData || []);

      // Set default colors and fonts
      setColors(defaultColors);
      setFonts(defaultFonts);

      // TODO: Fetch project-specific colors and fonts from visual identity
      if (selectedProject) {
        const { data: visualIdentity } = await supabase
          .from('visual_identities')
          .select('couleurs, polices')
          .eq('project_id', selectedProject.id)
          .single();

        if (visualIdentity) {
          if (visualIdentity.couleurs) {
            const projectColors = (visualIdentity.couleurs as any[]).map((color: any, index: number) => ({
              name: color.name || `Couleur ${index + 1}`,
              value: color.value || color.hex,
              category: color.category || 'primary'
            }));
            setColors([...defaultColors, ...projectColors]);
          }

          if (visualIdentity.polices) {
            const projectFonts = (visualIdentity.polices as any[]).map((font: any, index: number) => ({
              name: font.name || `Police ${index + 1}`,
              value: font.value || font.family,
              category: font.category || 'body'
            }));
            setFonts([...defaultFonts, ...projectFonts]);
          }
        }
      }

    } catch (error: any) {
      console.error('Error fetching data:', error);
    }
  };

  const detectInsertTrigger = (text: string, cursorPosition: number) => {
    const beforeCursor = text.substring(0, cursorPosition);
    const lastColon = beforeCursor.lastIndexOf(':');
    
    if (lastColon !== -1) {
      const afterColon = beforeCursor.substring(lastColon + 1);
      // Détecter "::" pour ouvrir la modale
      if (afterColon === ':' && cursorPosition - lastColon === 2) {
        setShowInsertModal(true);
      }
    }
  };

  const insertTag = (type: string, name: string, value?: string) => {
    const tag = `{${type}:${name}${value ? `|${value}` : ''}}`;
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
    
    setShowInsertModal(false);
    
    toast({
      title: "Tag inséré",
      description: `Le tag "${tag}" a été ajouté au prompt`,
    });
  };

  const transformPrompt = async (promptText: string): Promise<string> => {
    let transformedPrompt = promptText;
    
    // Remplacer les tags par leur contenu
    const tagRegex = /\{(\w+):([^}|]+)(\|([^}]+))?\}/g;
    const matches = [...promptText.matchAll(tagRegex)];
    
    for (const match of matches) {
      const [fullMatch, type, name, , value] = match;
      let replacement = fullMatch;
      
      switch (type) {
        case 'component':
          const component = components.find(c => c.nom === name);
          if (component && component.prompt) {
            replacement = component.prompt;
          }
          break;
          
        case 'file':
          const file = files.find(f => f.nom === name);
          if (file) {
            replacement = `Fichier: ${file.nom} (${file.type}) - URL: ${file.url}`;
          }
          break;
          
        case 'color':
          const color = colors.find(c => c.name === name);
          if (color) {
            replacement = `Couleur ${color.name}: ${color.value}`;
          }
          break;
          
        case 'font':
          const font = fonts.find(f => f.name === name);
          if (font) {
            replacement = `Police ${font.name}: ${font.value}`;
          }
          break;
      }
      
      transformedPrompt = transformedPrompt.replace(fullMatch, replacement);
    }
    
    return transformedPrompt;
  };

  const enhancePrompt = async () => {
    if (!value.trim()) return;

    setIsEnhancing(true);
    
    try {
      // D'abord transformer les tags
      const transformedPrompt = await transformPrompt(value);
      
      // Puis améliorer avec l'IA
      const { data, error } = await supabase.functions.invoke('enhance-prompt', {
        body: {
          prompt: transformedPrompt,
          mode: 'enhance'
        }
      });

      if (error) throw error;

      if (data?.enhancedPrompt) {
        onChange(data.enhancedPrompt);
        
        toast({
          title: "Prompt amélioré",
          description: "Votre prompt a été transformé et optimisé par l'IA",
        });
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
    detectInsertTrigger(newValue, cursorPosition);
  };

  const filterItems = (items: any[], searchTerm: string) => {
    if (!searchTerm) return items;
    return items.filter(item => 
      item.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  useEffect(() => {
    fetchData();
  }, [user, selectedProject]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Prompt Enhancer Avancé
          </CardTitle>
          <CardDescription className="text-xs">
            Tapez "::" pour insérer des éléments • Utilisez des tags {`{type:nom}`} • Tags disponibles: component, file, color, font
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            ref={textareaRef}
            placeholder="Votre prompt ici... Tapez :: pour insérer des éléments (composants, couleurs, polices, fichiers)"
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

      {/* Enhanced Insert Modal */}
      <Dialog open={showInsertModal} onOpenChange={setShowInsertModal}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="text-sm">Insérer des éléments</DialogTitle>
            <DialogDescription className="text-xs">
              Sélectionnez des éléments à insérer dans votre prompt
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <Input
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-sm"
            />
            
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="components" className="text-xs">
                  <Component className="h-3 w-3 mr-1" />
                  Composants
                </TabsTrigger>
                <TabsTrigger value="colors" className="text-xs">
                  <Palette className="h-3 w-3 mr-1" />
                  Couleurs
                </TabsTrigger>
                <TabsTrigger value="fonts" className="text-xs">
                  <Type className="h-3 w-3 mr-1" />
                  Polices
                </TabsTrigger>
                <TabsTrigger value="files" className="text-xs">
                  <FileText className="h-3 w-3 mr-1" />
                  Fichiers
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="components">
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {filterItems(components, searchQuery).length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">
                        Aucun composant trouvé
                      </p>
                    ) : (
                      filterItems(components, searchQuery).map((component) => (
                        <Card 
                          key={component.id} 
                          className="cursor-pointer hover:bg-muted transition-colors"
                          onClick={() => insertTag('component', component.nom)}
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
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="colors">
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {filterItems(colors, searchQuery).map((color, index) => (
                      <Card 
                        key={index} 
                        className="cursor-pointer hover:bg-muted transition-colors"
                        onClick={() => insertTag('color', color.name, color.value)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-6 h-6 rounded border border-border flex-shrink-0"
                              style={{ backgroundColor: color.value.includes('hsl') ? color.value : color.value }}
                            />
                            <div className="flex-1 min-w-0">
                              <h4 className="text-xs font-medium">{color.name}</h4>
                              <p className="text-xs text-muted-foreground truncate">
                                {color.value}
                              </p>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {color.category}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="fonts">
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {filterItems(fonts, searchQuery).map((font, index) => (
                      <Card 
                        key={index} 
                        className="cursor-pointer hover:bg-muted transition-colors"
                        onClick={() => insertTag('font', font.name, font.value)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-center gap-3">
                            <Type className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <h4 className="text-xs font-medium" style={{ fontFamily: font.value }}>
                                {font.name}
                              </h4>
                              <p className="text-xs text-muted-foreground truncate">
                                {font.value}
                              </p>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {font.category}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="files">
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {filterItems(files, searchQuery).length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">
                        Aucun fichier trouvé
                      </p>
                    ) : (
                      filterItems(files, searchQuery).map((file) => (
                        <Card 
                          key={file.id} 
                          className="cursor-pointer hover:bg-muted transition-colors"
                          onClick={() => insertTag('file', file.nom, file.url)}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-center gap-3">
                              {file.type.startsWith('image/') ? (
                                <Image className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                              ) : (
                                <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                              )}
                              <div className="flex-1 min-w-0">
                                <h4 className="text-xs font-medium truncate">
                                  {file.nom}
                                </h4>
                                <p className="text-xs text-muted-foreground truncate">
                                  {file.type}
                                </p>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {`{file:${file.nom}}`}
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EnhancedPromptEnhancer;