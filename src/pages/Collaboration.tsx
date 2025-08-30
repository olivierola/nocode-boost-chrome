import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  UserPlus, 
  Users, 
  Crown, 
  User, 
  Mail, 
  Trash2, 
  Search,
  Shield,
  Settings,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useProjects } from '@/hooks/useProjects';

interface Collaborator {
  id: string;
  project_id: string;
  user_id: string;
  role: 'owner' | 'collaborator';
  created_at: string;
  profile?: {
    full_name?: string;
    email?: string;
    avatar_url?: string;
  };
}

interface ProjectCollaboration {
  project_id: string;
  project_name: string;
  collaborators: Collaborator[];
  is_owner: boolean;
}

const Collaboration = () => {
  const [collaborations, setCollaborations] = useState<ProjectCollaboration[]>([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'collaborator'>('collaborator');
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const { user } = useAuth();
  const { projects, getUserRole } = useProjects();
  const { toast } = useToast();

  const fetchCollaborations = async () => {
    if (!user) return;

    try {
      const collaborationsData: ProjectCollaboration[] = [];

      for (const project of projects) {
        const userRole = getUserRole(project);
        const isOwner = userRole === 'owner';

        // Fetch collaborators for this project
        const { data: collaborators, error } = await supabase
          .from('collaborators')
          .select(`
            *,
            profiles!inner (
              full_name,
              email,
              avatar_url
            )
          `)
          .eq('project_id', project.id);

        if (error) throw error;

        collaborationsData.push({
          project_id: project.id,
          project_name: project.name,
          collaborators: (collaborators as any)?.map((collab: any) => ({
            ...collab,
            profile: collab.profiles?.[0] || null
          })) || [],
          is_owner: isOwner
        });
      }

      setCollaborations(collaborationsData);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les collaborations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const inviteCollaborator = async () => {
    if (!selectedProject || !inviteEmail.trim()) {
      toast({
        title: "Information manquante",
        description: "Veuillez sélectionner un projet et saisir un email",
        variant: "destructive",
      });
      return;
    }

    setInviting(true);

    try {
      // For this demo, we'll simulate finding the user by email
      // In a real app, you'd have a proper user lookup system
      
      // Check if user exists (simplified)
      const { data: existingUser, error: userError } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('email', inviteEmail.trim())
        .single();

      if (userError && userError.code !== 'PGRST116') {
        throw new Error("Erreur lors de la recherche de l'utilisateur");
      }

      if (!existingUser) {
        toast({
          title: "Utilisateur introuvable",
          description: "Aucun utilisateur trouvé avec cet email",
          variant: "destructive",
        });
        return;
      }

      // Check if already collaborator
      const { data: existingCollab } = await supabase
        .from('collaborators')
        .select('id')
        .eq('project_id', selectedProject)
        .eq('user_id', existingUser.user_id)
        .single();

      if (existingCollab) {
        toast({
          title: "Déjà collaborateur",
          description: "Cette personne est déjà collaboratrice du projet",
          variant: "destructive",
        });
        return;
      }

      // Add collaborator
      const { error: addError } = await supabase
        .from('collaborators')
        .insert({
          project_id: selectedProject,
          user_id: existingUser.user_id,
          role: inviteRole
        });

      if (addError) throw addError;

      toast({
        title: "Collaborateur ajouté",
        description: `${inviteEmail} a été ajouté au projet`,
      });

      setShowInviteDialog(false);
      setInviteEmail('');
      setSelectedProject('');
      await fetchCollaborations();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter le collaborateur",
        variant: "destructive",
      });
    } finally {
      setInviting(false);
    }
  };

  const removeCollaborator = async (collaborator: Collaborator) => {
    try {
      const { error } = await supabase
        .from('collaborators')
        .delete()
        .eq('id', collaborator.id);

      if (error) throw error;

      toast({
        title: "Collaborateur retiré",
        description: "Le collaborateur a été retiré du projet",
      });

      await fetchCollaborations();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de retirer le collaborateur",
        variant: "destructive",
      });
    }
  };

  const changeRole = async (collaborator: Collaborator, newRole: 'owner' | 'collaborator') => {
    try {
      const { error } = await supabase
        .from('collaborators')
        .update({ role: newRole })
        .eq('id', collaborator.id);

      if (error) throw error;

      toast({
        title: "Rôle modifié",
        description: "Le rôle du collaborateur a été mis à jour",
      });

      await fetchCollaborations();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de modifier le rôle",
        variant: "destructive",
      });
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return <Crown className="h-3 w-3" />;
      case 'collaborator': return <User className="h-3 w-3" />;
      default: return <Shield className="h-3 w-3" />;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner': return 'Propriétaire';
      case 'collaborator': return 'Collaborateur';
      default: return 'Inconnu';
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const filteredCollaborations = collaborations.filter(collab =>
    collab.project_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    collab.collaborators.some(c => 
      c.profile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.profile?.email?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  useEffect(() => {
    fetchCollaborations();
  }, [user, projects]);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-card flex-shrink-0 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-foreground">Collaboration</h2>
            <p className="text-xs text-muted-foreground">
              Gérez les membres et permissions de vos projets
            </p>
          </div>
          <Button size="sm" onClick={() => setShowInviteDialog(true)}>
            <UserPlus className="h-3 w-3 mr-1" />
            Inviter
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 py-4 overflow-y-auto">
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input
              placeholder="Rechercher un projet ou collaborateur..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 text-xs"
            />
          </div>

          {/* Projects and Collaborators */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredCollaborations.length === 0 ? (
            <Card className="border-dashed border-2">
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Users className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground text-center">
                  {searchTerm ? 'Aucune collaboration trouvée' : 'Aucune collaboration active'}
                </p>
                <p className="text-xs text-muted-foreground text-center mt-1">
                  Invitez des collaborateurs à vos projets
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredCollaborations.map((collab) => (
                <Card key={collab.project_id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-sm">{collab.project_name}</CardTitle>
                        <CardDescription className="text-xs">
                          {collab.collaborators.length} collaborateur{collab.collaborators.length > 1 ? 's' : ''}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={collab.is_owner ? 'default' : 'secondary'} className="text-xs">
                          {collab.is_owner ? 'Propriétaire' : 'Collaborateur'}
                        </Badge>
                        {collab.is_owner && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedProject(collab.project_id);
                              setShowInviteDialog(true);
                            }}
                          >
                            <UserPlus className="h-3 w-3 mr-1" />
                            Inviter
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      {collab.collaborators.map((collaborator) => (
                        <div key={collaborator.id} className="flex items-center justify-between p-3 bg-muted rounded-md">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={collaborator.profile?.avatar_url} />
                              <AvatarFallback className="text-xs">
                                {getInitials(collaborator.profile?.full_name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <h4 className="text-sm font-medium">
                                {collaborator.profile?.full_name || 'Utilisateur'}
                              </h4>
                              <p className="text-xs text-muted-foreground">
                                {collaborator.profile?.email}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {getRoleIcon(collaborator.role)}
                              <span className="ml-1">{getRoleLabel(collaborator.role)}</span>
                            </Badge>
                            {collab.is_owner && collaborator.user_id !== user?.id && (
                              <div className="flex gap-1">
                                {collaborator.role !== 'owner' && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => changeRole(collaborator, 'owner')}
                                    className="text-xs"
                                  >
                                    <Crown className="h-3 w-3" />
                                  </Button>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => removeCollaborator(collaborator)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Inviter un collaborateur
            </DialogTitle>
            <DialogDescription>
              Ajoutez une nouvelle personne à votre projet
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="project-select">Projet</Label>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un projet" />
                </SelectTrigger>
                <SelectContent>
                  {projects
                    .filter(project => getUserRole(project) === 'owner')
                    .map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="invite-email">Email du collaborateur</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="email@exemple.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="invite-role">Rôle</Label>
              <Select value={inviteRole} onValueChange={(value: 'collaborator') => setInviteRole(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="collaborator">Collaborateur</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Les collaborateurs peuvent accéder au projet avec le mot de passe
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowInviteDialog(false)}
              disabled={inviting}
            >
              Annuler
            </Button>
            <Button 
              onClick={inviteCollaborator}
              disabled={inviting || !selectedProject || !inviteEmail.trim()}
            >
              {inviting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Invitation...
                </>
              ) : (
                'Inviter'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Collaboration;