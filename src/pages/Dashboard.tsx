import { useAuth } from '@/hooks/useAuth';
import { useProjects } from '@/hooks/useProjects';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Loader2 } from 'lucide-react';
import CreateProjectDialog from '@/components/CreateProjectDialog';
import ProjectCard from '@/components/ProjectCard';

const Dashboard = () => {
  const { user } = useAuth();
  const { projects, loading } = useProjects();

  const getUserName = () => {
    return user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Utilisateur';
  };

  return (
    <div className="space-y-4">
      {/* Welcome Section */}
      <Card className="bg-muted/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Bienvenue, {getUserName()}!</CardTitle>
          <CardDescription className="text-xs">
            Extension Chrome pour workflows nocode
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{user?.email}</span>
          </p>
        </CardContent>
      </Card>

      {/* Projects Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Mes Projets</h2>
          <CreateProjectDialog />
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : projects.length === 0 ? (
          <Card className="border-dashed border-2 hover:border-primary transition-colors">
            <CardContent className="flex flex-col items-center justify-center py-8">
              <Plus className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground text-center mb-4">
                Aucun projet créé
              </p>
              <CreateProjectDialog>
                <Button size="sm">Créer votre premier projet</Button>
              </CreateProjectDialog>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 grid-cols-2">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;