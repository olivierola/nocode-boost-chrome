import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, Plus, Search, ExternalLink, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Component {
  id: string;
  nom: string;
  description: string | null;
  prompt: string | null;
  created_at: string;
}

const Components = () => {
  const [components, setComponents] = useState<Component[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
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
      toast({
        title: "Erreur",
        description: "Impossible de charger les composants",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyPrompt = async (component: Component) => {
    if (!component.prompt) return;

    try {
      await navigator.clipboard.writeText(component.prompt);
      setCopiedId(component.id);
      
      toast({
        title: "Prompt copié",
        description: `Le prompt pour "${component.nom}" a été copié`,
      });

      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de copier le prompt",
        variant: "destructive",
      });
    }
  };

  const addToPrompt = (component: Component) => {
    // Fonction pour ajouter le composant au prompt enhancer
    const tag = `{component:${component.nom}}`;
    
    // Émettre un événement pour le prompt enhancer
    window.dispatchEvent(new CustomEvent('addComponentTag', { 
      detail: { tag, component } 
    }));
    
    toast({
      title: "Composant ajouté",
      description: `Tag "${tag}" ajouté au prompt`,
    });
  };

  const filteredComponents = components.filter(component =>
    component.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    component.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    fetchComponents();
  }, [user]);

  return (
    <div className="w-[800px] h-[600px] bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card flex-shrink-0 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-foreground">Component Code</h1>
            <p className="text-xs text-muted-foreground">
              Gérez vos composants depuis 21st.dev
            </p>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="21st" className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-2 mx-6 mt-4">
            <TabsTrigger value="21st">21st.dev</TabsTrigger>
            <TabsTrigger value="saved">Composants sauvés</TabsTrigger>
          </TabsList>
          
          <TabsContent value="21st" className="flex-1 px-6 pb-4">
            <Card className="h-full">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Importer depuis 21st.dev</CardTitle>
                  <Button variant="outline" size="sm" asChild>
                    <a href="https://21st.dev" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Ouvrir
                    </a>
                  </Button>
                </div>
                <CardDescription className="text-xs">
                  Naviguez sur 21st.dev et utilisez le bouton "Copier prompt" pour sauvegarder vos composants
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="h-[400px] border border-border rounded-md overflow-hidden">
                  <iframe 
                    src="https://21st.dev" 
                    className="w-full h-full"
                    title="21st.dev Components"
                  />
                </div>
                <div className="mt-3 p-3 bg-muted rounded-md">
                  <p className="text-xs text-muted-foreground">
                    💡 Astuce : Une fois un composant trouvé, copiez son prompt pour l'ajouter automatiquement à votre collection
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="saved" className="flex-1 px-6 pb-4">
            <div className="space-y-4 h-full flex flex-col">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un composant..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 text-xs"
                />
              </div>

              {/* Components List */}
              <div className="flex-1 overflow-y-auto space-y-3">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                ) : filteredComponents.length === 0 ? (
                  <Card className="border-dashed border-2">
                    <CardContent className="flex flex-col items-center justify-center py-8">
                      <Plus className="h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground text-center">
                        {searchTerm ? 'Aucun composant trouvé' : 'Aucun composant sauvegardé'}
                      </p>
                      <p className="text-xs text-muted-foreground text-center mt-1">
                        Importez vos premiers composants depuis 21st.dev
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  filteredComponents.map((component) => (
                    <Card key={component.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-sm font-medium truncate">
                              {component.nom}
                            </CardTitle>
                            {component.description && (
                              <CardDescription className="text-xs line-clamp-2 mt-1">
                                {component.description}
                              </CardDescription>
                            )}
                          </div>
                          <Badge variant="outline" className="text-xs ml-2">
                            Composant
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyPrompt(component)}
                            className="flex-1"
                            disabled={!component.prompt}
                          >
                            {copiedId === component.id ? (
                              <Check className="h-3 w-3 mr-1" />
                            ) : (
                              <Copy className="h-3 w-3 mr-1" />
                            )}
                            {copiedId === component.id ? 'Copié!' : 'Copier prompt'}
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => addToPrompt(component)}
                            className="flex-1"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Ajouter au prompt
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Components;