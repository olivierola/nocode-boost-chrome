import { useState } from 'react';
import { useProjects } from '@/hooks/useProjects';
import { useProjectContext } from '@/hooks/useProjectContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FolderOpen, Plus } from 'lucide-react';
import CreateProjectDialog from '@/components/CreateProjectDialog';
import ProjectAccessDialog from '@/components/ProjectAccessDialog';
import ProjectSpotlightCard from '@/components/ProjectSpotlightCard';
import { DottedSurface } from '@/components/ui/dotted-surface';

const ProjectSelector = () => {
  const { projects, loading, getUserRole } = useProjects();
  const { selectProject } = useProjectContext();
  
  const [accessProject, setAccessProject] = useState<any>(null);

  const handleSelectProject = (project: any) => {
    if (project.password && getUserRole(project) !== 'owner') {
      setAccessProject(project);
    } else {
      selectProject(project);
    }
  };

  const handleProjectAccess = (project: any) => {
    selectProject(project);
    setAccessProject(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="relative flex-1 px-6 py-4 overflow-y-auto">
      <DottedSurface />
      <div className="relative max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-foreground">Sélectionnez un projet</h2>
          <p className="text-muted-foreground">
            Choisissez un projet pour accéder aux outils et fonctionnalités
          </p>
        </div>

        <div className="flex justify-center">
          <CreateProjectDialog>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nouveau Projet
            </Button>
          </CreateProjectDialog>
        </div>


        {projects.length === 0 ? (
          <Card className="text-center py-8">
            <CardContent>
              <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucun projet</h3>
              <p className="text-muted-foreground mb-4">
                Créez votre premier projet pour commencer
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {projects.map((project) => (
              <ProjectSpotlightCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>

      

      {accessProject && (
        <ProjectAccessDialog
          isOpen={!!accessProject}
          onClose={() => setAccessProject(null)}
          onSuccess={() => handleProjectAccess(accessProject)}
          projectName={accessProject.name}
          expectedPassword={accessProject.password || ''}
        />
      )}
    </div>
  );
};

export default ProjectSelector;