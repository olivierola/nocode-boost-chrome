import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { MoreHorizontal, Edit, Trash2, Users, Lock, Calendar, ExternalLink, Monitor, Smartphone, Tablet, Apple, Chrome } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Project, useProjects } from '@/hooks/useProjects';
import { useProjectContext } from '@/hooks/useProjectContext';
import { CardSpotlight } from '@/components/ui/card-spotlight';
import EditProjectDialog from './EditProjectDialog';
import ProjectAccessDialog from './ProjectAccessDialog';

const PROJECT_TYPE_CONFIG = {
  web: { icon: Monitor, color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400', label: 'Web' },
  mobile: { icon: Smartphone, color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400', label: 'Mobile' },
  desktop: { icon: Tablet, color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400', label: 'Desktop' },
  ios: { icon: Apple, color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400', label: 'iOS' },
  'cross-platform': { icon: Chrome, color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400', label: 'Cross-Platform' }
};

interface ProjectSpotlightCardProps {
  project: Project;
}

const ProjectSpotlightCard = ({ project }: ProjectSpotlightCardProps) => {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [accessDialogOpen, setAccessDialogOpen] = useState(false);
  const { deleteProject, getUserRole } = useProjects();
  const { selectProject } = useProjectContext();

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
      selectProject(project);
    } else {
      // Demander le mot de passe pour les collaborateurs invités
      setAccessDialogOpen(true);
    }
  };

  const handleAccessSuccess = () => {
    selectProject(project);
    setAccessDialogOpen(false);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd MMM yyyy', { locale: fr });
  };

  const projectType = (project as any).project_type || 'web';
  const techStack = (project as any).tech_stack;
  const typeConfig = PROJECT_TYPE_CONFIG[projectType as keyof typeof PROJECT_TYPE_CONFIG] || PROJECT_TYPE_CONFIG.web;
  const TypeIcon = typeConfig.icon;

  return (
    <>
      <CardSpotlight 
        className="h-auto min-h-[200px] group cursor-pointer bg-background/50 border-border/50 backdrop-blur-sm" 
        color="hsl(var(--primary) / 0.05)"
        onClick={handleProjectAccess}
      >
        <div className="relative z-20 h-full flex flex-col">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-semibold text-foreground truncate">
                  {project.name}
                </h3>
                <Badge variant="outline" className={`text-xs ${typeConfig.color}`}>
                  <TypeIcon className="h-3 w-3 mr-1" />
                  {typeConfig.label}
                </Badge>
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
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-32">
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditDialogOpen(true); }}>
                    <Edit className="h-4 w-4 mr-2" />
                    Modifier
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={(e) => { e.stopPropagation(); setDeleteDialogOpen(true); }}
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
            <div className="flex items-center gap-2">
              <Badge variant={isOwner ? "default" : "secondary"} className="text-xs">
                {isOwner ? "Propriétaire" : "Collaborateur"}
              </Badge>
              {techStack && (
                <Badge variant="secondary" className="text-xs">
                  {techStack}
                </Badge>
              )}
            </div>
            {project.collaborators && project.collaborators.length > 1 && (
              <div className="flex items-center text-xs text-muted-foreground">
                <Users className="h-3 w-3 mr-1" />
                {project.collaborators.length}
              </div>
            )}
          </div>

          {/* Date */}
          <div className="flex items-center text-xs text-muted-foreground">
            <Calendar className="h-3 w-3 mr-1" />
            Créé le {formatDate(project.created_at)}
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