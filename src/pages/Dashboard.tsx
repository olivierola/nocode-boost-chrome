import { useAuth } from '@/hooks/useAuth';
import { useProjects } from '@/hooks/useProjects';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LogOut, Plus, Loader2 } from 'lucide-react';
import CreateProjectDialog from '@/components/CreateProjectDialog';
import ProjectCard from '@/components/ProjectCard';

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const { projects, loading } = useProjects();

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getUserName = () => {
    return user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Utilisateur';
  };

  return (
    <div className="w-[800px] h-[600px] bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card flex-shrink-0">
        <div className="px-6 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h1 className="text-lg font-bold text-foreground">Super NoCode</h1>
            <span className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded-full">Extension</span>
          </div>
          
          <div className="flex items-center space-x-3">
            <Avatar className="h-6 w-6">
              <AvatarImage src={user?.user_metadata?.avatar_url} />
              <AvatarFallback className="text-xs">
                {getInitials(getUserName())}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs font-medium text-foreground max-w-[100px] truncate">
              {getUserName()}
            </span>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-6 py-4 overflow-y-auto">
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
      </main>
    </div>
  );
};

export default Dashboard;