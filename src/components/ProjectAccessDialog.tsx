import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Lock } from 'lucide-react';

interface ProjectAccessDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  projectName: string;
  expectedPassword: string;
}

const ProjectAccessDialog = ({
  isOpen,
  onClose,
  onSuccess,
  projectName,
  expectedPassword
}: ProjectAccessDialogProps) => {
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (password === expectedPassword) {
        toast({
          title: "Accès autorisé",
          description: `Bienvenue dans le projet "${projectName}"`,
        });
        onSuccess();
        onClose();
        setPassword('');
      } else {
        toast({
          title: "Mot de passe incorrect",
          description: "Veuillez vérifier le mot de passe et réessayer",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setPassword('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Accès au projet
          </DialogTitle>
          <DialogDescription>
            Ce projet nécessite un mot de passe pour y accéder.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="project-name">Projet</Label>
              <Input
                id="project-name"
                value={projectName}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-password">Mot de passe</Label>
              <Input
                id="project-password"
                type="password"
                placeholder="Entrez le mot de passe du projet"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting || !password.trim()}>
              {isSubmitting ? "Vérification..." : "Accéder"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ProjectAccessDialog;