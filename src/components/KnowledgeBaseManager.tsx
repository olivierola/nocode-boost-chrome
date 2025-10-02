import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, Palette, Type, Code, Trash2 } from "lucide-react";

interface KnowledgeResource {
  id: string;
  resource_type: string;
  name: string;
  description: string;
  content: any;
  tags: string[];
  created_at: string;
}

interface KnowledgeBaseManagerProps {
  projectId: string;
}

const resourceIcons = {
  documentation: FileText,
  component: Code,
  font: Type,
  color_palette: Palette,
  style_guide: FileText,
};

export function KnowledgeBaseManager({ projectId }: KnowledgeBaseManagerProps) {
  const [resources, setResources] = useState<KnowledgeResource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newResource, setNewResource] = useState({
    resource_type: 'component',
    name: '',
    description: '',
    content: '',
    tags: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    loadResources();
  }, [projectId]);

  const loadResources = async () => {
    try {
      const { data, error } = await supabase
        .from('knowledge_base')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setResources(data || []);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddResource = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      let contentJson = {};
      try {
        contentJson = newResource.resource_type === 'component' 
          ? { prompt: newResource.content }
          : JSON.parse(newResource.content);
      } catch {
        contentJson = { raw: newResource.content };
      }

      const { error } = await supabase
        .from('knowledge_base')
        .insert({
          project_id: projectId,
          user_id: user.id,
          resource_type: newResource.resource_type,
          name: newResource.name,
          description: newResource.description,
          content: contentJson,
          tags: newResource.tags.split(',').map(t => t.trim()).filter(Boolean),
        });

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Ressource ajoutée à la base de connaissances",
      });

      setIsDialogOpen(false);
      setNewResource({ resource_type: 'component', name: '', description: '', content: '', tags: '' });
      loadResources();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteResource = async (id: string) => {
    try {
      const { error } = await supabase
        .from('knowledge_base')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Ressource supprimée",
      });

      loadResources();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return <div className="p-4">Chargement...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Base de Connaissances</h3>
          <p className="text-sm text-muted-foreground">
            Ressources utilisées par l'agent pour enrichir les prompts
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Ajouter
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Ajouter une ressource</DialogTitle>
              <DialogDescription>
                Ajoutez des composants, styles, polices ou documentation pour enrichir les prompts
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Type de ressource</Label>
                <Select value={newResource.resource_type} onValueChange={(value) => setNewResource({ ...newResource, resource_type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="component">Composant</SelectItem>
                    <SelectItem value="font">Police</SelectItem>
                    <SelectItem value="color_palette">Palette de couleurs</SelectItem>
                    <SelectItem value="style_guide">Guide de style</SelectItem>
                    <SelectItem value="documentation">Documentation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Nom</Label>
                <Input
                  value={newResource.name}
                  onChange={(e) => setNewResource({ ...newResource, name: e.target.value })}
                  placeholder="Ex: Button Primary"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Input
                  value={newResource.description}
                  onChange={(e) => setNewResource({ ...newResource, description: e.target.value })}
                  placeholder="Description courte"
                />
              </div>
              <div>
                <Label>Contenu {newResource.resource_type === 'component' ? '(Prompt)' : '(JSON ou texte)'}</Label>
                <Textarea
                  value={newResource.content}
                  onChange={(e) => setNewResource({ ...newResource, content: e.target.value })}
                  placeholder={newResource.resource_type === 'component' ? 'Prompt pour générer le composant...' : 'Contenu JSON ou texte...'}
                  rows={8}
                />
              </div>
              <div>
                <Label>Tags (séparés par virgule)</Label>
                <Input
                  value={newResource.tags}
                  onChange={(e) => setNewResource({ ...newResource, tags: e.target.value })}
                  placeholder="ui, button, primary"
                />
              </div>
              <Button onClick={handleAddResource} className="w-full">
                Ajouter
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {resources.map((resource) => {
          const Icon = resourceIcons[resource.resource_type as keyof typeof resourceIcons] || FileText;
          return (
            <Card key={resource.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="w-5 h-5" />
                    <CardTitle className="text-base">{resource.name}</CardTitle>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteResource(resource.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <CardDescription>{resource.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1">
                  {resource.tags.map((tag, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {resources.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Aucune ressource dans la base de connaissances.
            <br />
            Ajoutez des composants, styles et documentation pour que l'agent puisse les utiliser.
          </CardContent>
        </Card>
      )}
    </div>
  );
}