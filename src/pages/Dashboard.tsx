import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LogOut, Settings, Plus } from 'lucide-react';

const Dashboard = () => {
  const { user, signOut } = useAuth();

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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-foreground">Super NoCode</h1>
            <span className="text-sm text-muted-foreground">Dashboard</span>
          </div>
          
          <div className="flex items-center space-x-4">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user?.user_metadata?.avatar_url} />
              <AvatarFallback className="text-xs">
                {getInitials(getUserName())}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium text-foreground">
              {getUserName()}
            </span>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Déconnexion
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6">
          {/* Welcome Section */}
          <Card>
            <CardHeader>
              <CardTitle>Bienvenue, {getUserName()}!</CardTitle>
              <CardDescription>
                Votre espace de travail pour accélérer vos workflows de développement nocode.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Connecté en tant que: <span className="font-medium text-foreground">{user?.email}</span>
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Session persistante active - vous resterez connecté même après fermeture du navigateur.
              </p>
            </CardContent>
          </Card>

          {/* Projects Section */}
          <div className="grid gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground">Mes Projets</h2>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nouveau Projet
              </Button>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {/* Placeholder project cards */}
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg">Projet Example 1</CardTitle>
                  <CardDescription>
                    Workflow d'automatisation pour e-commerce
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Modifié: Il y a 2h</span>
                    <Button variant="ghost" size="sm">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg">Projet Example 2</CardTitle>
                  <CardDescription>
                    Intégration API et webhooks
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Modifié: Hier</span>
                    <Button variant="ghost" size="sm">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-dashed border-2 hover:border-primary transition-colors cursor-pointer">
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <Plus className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-center">
                    Créer un nouveau projet
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;