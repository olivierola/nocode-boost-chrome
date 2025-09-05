import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface CreateComponentDialogProps {
  onComponentCreated?: () => void;
  children?: React.ReactNode;
}

const CreateComponentDialog = ({ onComponentCreated, children }: CreateComponentDialogProps) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleCreate = async () => {
    if (!user) return;
    
    if (!name.trim()) {
      toast({
        title: "Erreur",
        description: "Le nom du composant est requis",
        variant: "destructive",
      });
      return;
    }

    if (!prompt.trim()) {
      toast({
        title: "Erreur", 
        description: "Le prompt du composant est requis",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('components')
        .insert({
          nom: name.trim(),
          description: description.trim() || null,
          prompt: prompt.trim(),
          user_id: user.id
        });

      if (error) throw error;

      toast({
        title: "Composant créé",
        description: `Le composant "${name}" a été ajouté avec succès`,
      });

      // Reset form
      setName('');
      setDescription('');
      setPrompt('');
      setOpen(false);

      // Callback to refresh parent component
      if (onComponentCreated) {
        onComponentCreated();
      }

    } catch (error: any) {
      console.error('Error creating component:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer le composant",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Créer un composant
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Créer un nouveau composant
          </DialogTitle>
          <DialogDescription>
            Ajoutez un composant personnalisé à votre bibliothèque
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom du composant *</Label>
            <Input
              id="name"
              placeholder="Ex: Bouton premium"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optionnel)</Label>
            <Input
              id="description"
              placeholder="Ex: Bouton avec effet de brillance"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="prompt">Prompt *</Label>
            <Textarea
              id="prompt"
              placeholder="Décrivez le composant en détail..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[100px]"
            />
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={handleCreate}
              disabled={loading || !name.trim() || !prompt.trim()}
              className="flex-1"
            >
              {loading ? 'Création...' : 'Créer le composant'}
            </Button>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateComponentDialog;