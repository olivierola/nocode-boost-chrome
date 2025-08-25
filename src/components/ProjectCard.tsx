import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { MoreHorizontal, Edit, Trash2, Users, Lock, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Project, useProjects } from '@/hooks/useProjects';
import EditProjectDialog from './EditProjectDialog';
import ProjectAccessDialog from './ProjectAccessDialog';

interface ProjectCardProps {
  project: Project;
}

const ProjectCard = ({ project }: ProjectCardProps) => {
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
      <Card className="hover:shadow-md transition-shadow group">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-medium truncate">
                  {project.name}
                </CardTitle>
                {hasPassword && !isOwner && (
                  <Lock className="h-3 w-3 text-muted-foreground" />
                )}
              </div>
              {project.description && (
                <CardDescription className="text-xs line-clamp-2 mt-1">
                  {project.description}
                </CardDescription>
              )}
            </div>
            
            {isOwner && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreHorizontal className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-32">
                  <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
                    <Edit className="h-3 w-3 mr-2" />
                    Modifier
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setDeleteDialogOpen(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-3 w-3 mr-2" />
                    Supprimer
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
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
            
            <div className="flex items-center text-xs text-muted-foreground">
              <Calendar className="h-3 w-3 mr-1" />
              {formatDate(project.created_at)}
            </div>
            
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
        </CardContent>
      </Card>

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

export default ProjectCard;