import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, Mail, Shield, Trash2, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useProjects } from '@/hooks/useProjects';

interface Collaborator {
  id: string;
  user_id: string;
  role: 'owner' | 'collaborator';
  created_at: string;
  profiles?: {
    email: string;
    full_name: string;
  };
}

interface InviteCollaboratorDialogProps {
  projectId: string;
  children: React.ReactNode;
}

const InviteCollaboratorDialog = ({ projectId, children }: InviteCollaboratorDialogProps) => {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'collaborator'>('collaborator');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleInvite = async () => {
    if (!email.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez saisir une adresse email",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // In a real implementation, you would:
      // 1. Check if user exists in auth.users
      // 2. Send invitation email
      // 3. Create pending invitation record
      // For now, we'll simulate adding the collaborator directly

      // Check if the user exists in profiles table
      const { data: existingProfile, error: profileError } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('email', email)
        .maybeSingle();

      if (profileError) {
        toast({
          title: "Erreur",
          description: "Erreur lors de la vérification de l'utilisateur",
          variant: "destructive",
        });
        return;
      }

      if (!existingProfile) {
        toast({
          title: "Utilisateur introuvable",
          description: "Aucun utilisateur trouvé avec cet email",
          variant: "destructive",
        });
        return;
      }

      const existingUser = { user_id: existingProfile.user_id };

      // Check if already a collaborator
      const { data: existingCollaborator } = await supabase
        .from('collaborators')
        .select('*')
        .eq('project_id', projectId)
        .eq('user_id', existingUser.user_id)
        .single();

      if (existingCollaborator) {
        toast({
          title: "Déjà collaborateur",
          description: "Cette personne est déjà collaboratrice du projet",
          variant: "destructive",
        });
        return;
      }

      // Add collaborator
      const { error } = await supabase
        .from('collaborators')
        .insert({
          project_id: projectId,
          user_id: existingUser.user_id,
          role: role
        });

      if (error) throw error;

      toast({
        title: "Invitation envoyée",
        description: `${email} a été ajouté(e) comme ${role === 'collaborator' ? 'collaborateur' : 'propriétaire'}`,
      });

      setEmail('');
      setOpen(false);

      // Log activity
      if ((window as any).logActivity) {
        (window as any).logActivity('collaborator_added', {
          projectId,
          email,
          role
        });
      }

    } catch (error: any) {
      console.error('Error inviting collaborator:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer l'invitation",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Inviter un collaborateur
          </DialogTitle>
          <DialogDescription>
            Ajoutez un membre à votre équipe projet
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Adresse email</Label>
            <Input
              id="email"
              type="email"
              placeholder="collaborateur@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Rôle</Label>
            <Select value={role} onValueChange={(value: any) => setRole(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="collaborator">Collaborateur</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Les collaborateurs peuvent consulter et modifier le projet
            </p>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={handleInvite}
              disabled={loading || !email.trim()}
              className="flex-1"
            >
              <Send className="h-4 w-4 mr-2" />
              {loading ? 'Envoi...' : 'Envoyer l\'invitation'}
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

export default InviteCollaboratorDialog;