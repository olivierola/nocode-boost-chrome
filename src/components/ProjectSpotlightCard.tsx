import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { MoreHorizontal, Edit, Trash2, Users, Lock, Calendar, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Project, useProjects } from '@/hooks/useProjects';
import { CardSpotlight } from '@/components/ui/card-spotlight';
import EditProjectDialog from './EditProjectDialog';
import ProjectAccessDialog from './ProjectAccessDialog';

interface ProjectSpotlightCardProps {
  project: Project;
}

const ProjectSpotlightCard = ({ project }: ProjectSpotlightCardProps) => {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [accessDialogOpen, setAccessDialogOpen] = useState(false);
  const { deleteProject, getUserRole } = useProjects();

  const userRole = getUserRole(project);
  const isOwner = userRole === 'owner';
  const hasPassword = Boolean(project.password);

  const handleDelete = async () => {
    const success = await deleteProject(project.id);
    if (success) {
      setDeleteDialogOpen(false);
    }
  };

  const handleProjectAccess = () => {
    if (isOwner || !hasPassword) {
      // Accès direct pour le propriétaire ou projets sans mot de passe
      console.log('Accès direct au projet:', project.name);
    } else {
      // Demander le mot de passe pour les collaborateurs invités
      setAccessDialogOpen(true);
    }
  };

  const handleAccessSuccess = () => {
    console.log('Accès autorisé au projet:', project.name);
    // Ici vous pouvez rediriger vers la page du projet
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd MMM yyyy', { locale: fr });
  };

  return (
    <>
      <CardSpotlight className="h-auto min-h-[200px] group cursor-pointer">
        <div className="relative z-20 h-full flex flex-col">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-semibold text-foreground truncate">
                  {project.name}
                </h3>
                {hasPassword && !isOwner && (
                  <Lock className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              {project.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {project.description}
                </p>
              )}
            </div>
            
            {isOwner && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-32">
                  <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Modifier
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setDeleteDialogOpen(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Supprimer
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* URL */}
          {project.url && (
            <div className="flex items-center gap-2 mb-4 p-2 bg-muted/50 rounded-md">
              <ExternalLink className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground truncate">{project.url}</span>
            </div>
          )}

          {/* Status and Collaborators */}
          <div className="flex items-center justify-between mb-4">
            <Badge variant={isOwner ? "default" : "secondary"} className="text-xs">
              {isOwner ? "Propriétaire" : "Collaborateur"}
            </Badge>
            {project.collaborators && project.collaborators.length > 1 && (
              <div className="flex items-center text-xs text-muted-foreground">
                <Users className="h-3 w-3 mr-1" />
                {project.collaborators.length}
              </div>
            )}
          </div>

          {/* Date */}
          <div className="flex items-center text-xs text-muted-foreground mb-4">
            <Calendar className="h-3 w-3 mr-1" />
            Créé le {formatDate(project.created_at)}
          </div>

          {/* Action Button */}
          <div className="mt-auto">
            <Button size="sm" className="w-full" onClick={handleProjectAccess}>
              {hasPassword && !isOwner ? (
                <>
                  <Lock className="h-3 w-3 mr-2" />
                  Accéder au projet
                </>
              ) : (
                'Ouvrir le projet'
              )}
            </Button>
          </div>
        </div>
      </CardSpotlight>

      <EditProjectDialog
        project={project}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />

      <ProjectAccessDialog
        isOpen={accessDialogOpen}
        onClose={() => setAccessDialogOpen(false)}
        onSuccess={handleAccessSuccess}
        projectName={project.name}
        expectedPassword={project.password || ''}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le projet</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer le projet "{project.name}" ? 
              Cette action est irréversible et supprimera définitivement toutes les données associées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ProjectSpotlightCard;