import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, Plus, Search, ExternalLink, Check, Trash2, Type } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import CreateComponentDialog from '@/components/CreateComponentDialog';
import { ComponentCard } from '@/components/ui/expandable-card';

interface Component {
  id: string;
  nom: string;
  description: string | null;
  prompt: string | null;
  type?: string;
  font_family?: string;
  font_url?: string;
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
    <div className="h-full w-full relative">
      <iframe 
        src="https://21st.dev" 
        className="w-full h-full border-0"
        title="21st.dev Components"
        sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals"
        allow="clipboard-read; clipboard-write"
      />
      
      {/* Floating button to capture components from iframe */}
      <div className="absolute top-4 right-4 z-10">
        <CreateComponentDialog onComponentCreated={() => {
          // Optionally switch to saved components tab
          const event = new CustomEvent('switchToSavedComponents');
          window.dispatchEvent(event);
        }}>
          <Button variant="secondary" size="sm" className="shadow-lg">
            <Plus className="h-4 w-4 mr-2" />
            Importer depuis cette page
          </Button>
        </CreateComponentDialog>
      </div>
    </div>
  );
};

const ComponentsSaved = () => {
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

  const deleteComponent = async (componentId: string) => {
    try {
      const { error } = await supabase
        .from('components')
        .delete()
        .eq('id', componentId)
        .eq('user_id', user?.id);

      if (error) throw error;

      toast({
        title: "Composant supprimé",
        description: "Le composant a été supprimé avec succès",
      });

      fetchComponents(); // Refresh list
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le composant",
        variant: "destructive",
      });
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

  const renderItemsByType = (type: string) => {
    const items = filteredComponents.filter(c => (c.type || 'component') === type);
    
    if (loading) {
      return (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </div>
      );
    }

    if (items.length === 0) {
      return (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Type className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground text-center">
              Aucun élément de ce type
            </p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="grid gap-3">
        {items.map((component) => (
          <ComponentCard
            key={component.id}
            id={component.id}
            title={component.nom}
            description={component.description}
            prompt={component.prompt}
            type={component.type || 'component'}
            created_at={component.created_at}
            onCopy={() => copyPrompt(component)}
            onAddToPrompt={() => addToPrompt(component)}
            onDelete={() => deleteComponent(component.id)}
          />
        ))}
      </div>
    );
  };

  useEffect(() => {
    fetchComponents();
  }, [user]);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-card flex-shrink-0 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold">Composants Sauvegardés</h2>
            <p className="text-muted-foreground">
              Gérez vos composants, polices et fichiers sauvegardés
            </p>
          </div>
          <CreateComponentDialog onComponentCreated={fetchComponents} />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 py-4 space-y-4 flex flex-col">
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

        {/* Tabs for different types */}
        <Tabs defaultValue="all" className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">Tous</TabsTrigger>
            <TabsTrigger value="components">Composants</TabsTrigger>
            <TabsTrigger value="fonts">Polices</TabsTrigger>
            <TabsTrigger value="files">Fichiers</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="flex-1 overflow-y-auto space-y-3 mt-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : filteredComponents.length === 0 ? (
              <Card className="border-dashed border-2">
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <Plus className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground text-center">
                    {searchTerm ? 'Aucun élément trouvé' : 'Aucun élément sauvegardé'}
                  </p>
                  <p className="text-xs text-muted-foreground text-center mt-1">
                    Commencez par ajouter des composants, polices ou fichiers
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {filteredComponents.map((component) => (
                  <ComponentCard
                    key={component.id}
                    id={component.id}
                    title={component.nom}
                    description={component.description}
                    prompt={component.prompt}
                    type={component.type || 'component'}
                    created_at={component.created_at}
                    onCopy={() => copyPrompt(component)}
                    onAddToPrompt={() => addToPrompt(component)}
                    onDelete={() => deleteComponent(component.id)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="components" className="flex-1 overflow-y-auto space-y-3 mt-4">
            {renderItemsByType('component')}
          </TabsContent>

          <TabsContent value="fonts" className="flex-1 overflow-y-auto space-y-3 mt-4">
            {renderItemsByType('font')}
          </TabsContent>

          <TabsContent value="files" className="flex-1 overflow-y-auto space-y-3 mt-4">
            {renderItemsByType('file')}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Components;