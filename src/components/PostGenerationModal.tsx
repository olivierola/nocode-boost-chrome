import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface PostGenerationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onPostsGenerated: (posts: any[]) => void;
}

export const PostGenerationModal = ({
  open,
  onOpenChange,
  projectId,
  onPostsGenerated,
}: PostGenerationModalProps) => {
  const { user } = useAuth();
  const { checkUsageLimit } = useSubscription();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    tone: '',
    subject: '',
    post_type: '',
    count: 10,
  });

  const tones = [
    { value: 'professionnel', label: 'Professionnel' },
    { value: 'décontracté', label: 'Décontracté' },
    { value: 'enthousiaste', label: 'Enthousiaste' },
    { value: 'informatif', label: 'Informatif' },
    { value: 'inspirant', label: 'Inspirant' },
    { value: 'humoristique', label: 'Humoristique' },
  ];

  const postTypes = [
    { value: 'informatif', label: 'Informatif' },
    { value: 'engageant', label: 'Engageant' },
    { value: 'promotionnel', label: 'Promotionnel' },
    { value: 'éducatif', label: 'Éducatif' },
    { value: 'inspirationnel', label: 'Inspirationnel' },
    { value: 'question', label: 'Question/Sondage' },
  ];

  const subjects = [
    { value: 'lancement-produit', label: 'Lancement de produit' },
    { value: 'fonctionnalités', label: 'Nouvelles fonctionnalités' },
    { value: 'témoignages', label: 'Témoignages clients' },
    { value: 'conseils', label: 'Conseils et astuces' },
    { value: 'tendances', label: 'Tendances du secteur' },
    { value: 'équipe', label: 'Équipe et culture' },
    { value: 'technologie', label: 'Innovation technologique' },
    { value: 'succès', label: 'Histoires de succès' },
  ];

  const handleGenerate = async () => {
    if (!user || !formData.tone || !formData.subject || !formData.post_type) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);

    try {
      // Check usage limit
      const { can_proceed } = await checkUsageLimit('post_generation');
      if (!can_proceed) {
        toast.error('Limite d\'usage atteinte pour la génération de posts');
        return;
      }

      const { data, error } = await supabase.functions.invoke('generate-posts', {
        body: {
          project_id: projectId,
          tone: formData.tone,
          subject: formData.subject,
          post_type: formData.post_type,
          count: formData.count,
        },
      });

      if (error) throw error;

      if (data.posts) {
        onPostsGenerated(data.posts);
        setFormData({
          tone: '',
          subject: '',
          post_type: '',
          count: 10,
        });
      }
    } catch (error) {
      console.error('Error generating posts:', error);
      toast.error('Erreur lors de la génération des posts');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Générer des posts
          </DialogTitle>
          <DialogDescription>
            Configurez les paramètres pour générer des posts engageants pour votre projet.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tone">Tonalité</Label>
            <Select value={formData.tone} onValueChange={(value) => setFormData({ ...formData, tone: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Choisissez une tonalité" />
              </SelectTrigger>
              <SelectContent>
                {tones.map((tone) => (
                  <SelectItem key={tone.value} value={tone.value}>
                    {tone.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Sujet</Label>
            <Select value={formData.subject} onValueChange={(value) => setFormData({ ...formData, subject: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Choisissez un sujet" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((subject) => (
                  <SelectItem key={subject.value} value={subject.value}>
                    {subject.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="post_type">Type de post</Label>
            <Select value={formData.post_type} onValueChange={(value) => setFormData({ ...formData, post_type: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Choisissez un type" />
              </SelectTrigger>
              <SelectContent>
                {postTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="count">Nombre de posts</Label>
            <Input
              id="count"
              type="number"
              min="1"
              max="20"
              value={formData.count}
              onChange={(e) => setFormData({ ...formData, count: parseInt(e.target.value) || 10 })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button onClick={handleGenerate} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Génération...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Générer
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};