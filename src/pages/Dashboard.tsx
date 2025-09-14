import { useAuth } from '@/hooks/useAuth';
import { useProjects } from '@/hooks/useProjects';
import { useSubscription } from '@/hooks/useSubscription';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Loader2, CreditCard, Crown } from 'lucide-react';
import CreateProjectDialog from '@/components/CreateProjectDialog';
import ProjectSpotlightCard from '@/components/ProjectSpotlightCard';
import ActivityLogger from '@/components/ActivityLogger';
import ProjectStatistics from '@/components/ProjectStatistics';

const Dashboard = () => {
  const { user } = useAuth();
  const { projects, loading } = useProjects();
  const { subscription } = useSubscription();

  const getUserName = () => {
    return user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Utilisateur';
  };

  return (
    <div className="space-y-4">
      {/* Welcome Section */}
      <Card className="bg-muted/30">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                <CardTitle className="text-base">Bienvenue, {getUserName()}!</CardTitle>
                <CardDescription className="text-xs">
                  Extension Chrome pour workflows nocode
                </CardDescription>
              </div>
              {subscription?.subscribed && (
                <Badge variant="secondary" className="gap-1 bg-primary/10 text-primary border-primary/20">
                  <Crown className="h-3 w-3" />
                  {subscription.subscription_tier}
                </Badge>
              )}
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.open('/payment', '_blank')}
              className="gap-2"
            >
              <CreditCard className="h-4 w-4" />
              Abonnements
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{user?.email}</span>
          </p>
        </CardContent>
      </Card>

      {/* Statistics and Activity Row */}
      <div className="grid grid-cols-2 gap-4">
        <ProjectStatistics />
        <ActivityLogger />
      </div>

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
              <ProjectSpotlightCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;