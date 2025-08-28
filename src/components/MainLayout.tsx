import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useProjectContext } from '@/hooks/useProjectContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { LogOut, Home, Code, Map, Search, Palette, Upload, Users, FolderOpen, X, CreditCard } from 'lucide-react';

// Import all components
import Dashboard from '@/pages/Dashboard';
import Components from '@/pages/Components';
import PlanGenerator from '@/pages/PlanGenerator';
import UXAudit from '@/pages/UXAudit';
import VisualIdentity from '@/pages/VisualIdentity';
import MediaUpload from '@/pages/MediaUpload';
import Collaboration from '@/pages/Collaboration';
import Payment from '@/pages/Payment';
import NotificationCenter from '@/components/NotificationCenter';
import ProjectSelector from '@/components/ProjectSelector';

const MainLayout = () => {
  const { user, signOut } = useAuth();
  const { selectedProject, clearProject, isProjectSelected } = useProjectContext();
  const [activeTab, setActiveTab] = useState('dashboard');

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
    <div className="w-[800px] h-[600px] bg-background flex flex-col relative">
      <NotificationCenter />
      
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/3 right-1/4 w-48 h-48 bg-accent/10 rounded-full blur-2xl animate-pulse delay-1000" />
        <div className="absolute top-2/3 left-1/2 w-32 h-32 bg-muted/20 rounded-full blur-xl animate-pulse delay-500" />
      </div>
      
      {/* Fixed Header */}
      <header className="border-b border-border bg-card flex-shrink-0 fixed top-0 left-0 right-0 z-50 w-[800px]">
        <div className="px-6 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h1 className="text-lg font-bold text-foreground">Super NoCode</h1>
            {selectedProject && (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="gap-1">
                  <FolderOpen className="h-3 w-3" />
                  {selectedProject.name}
                </Badge>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearProject}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
            
            {/* Compact Tab Navigation */}
            {isProjectSelected && (
              <div className="flex items-center gap-1 ml-4 bg-muted/50 p-1 rounded-lg backdrop-blur-sm">
                <Button 
                  variant={activeTab === 'dashboard' ? 'default' : 'ghost'} 
                  size="sm" 
                  onClick={() => setActiveTab('dashboard')}
                  className={`h-7 w-7 p-0 rounded-md ${activeTab === 'dashboard' ? 'bg-background shadow-sm' : 'hover:bg-background/50'}`}
                  title="Dashboard"
                >
                  <Home className="h-3 w-3" />
                </Button>
                <Button 
                  variant={activeTab === 'components' ? 'default' : 'ghost'} 
                  size="sm" 
                  onClick={() => setActiveTab('components')}
                  className={`h-7 w-7 p-0 rounded-md ${activeTab === 'components' ? 'bg-background shadow-sm' : 'hover:bg-background/50'}`}
                  title="Components"
                >
                  <Code className="h-3 w-3" />
                </Button>
                <Button 
                  variant={activeTab === 'plans' ? 'default' : 'ghost'} 
                  size="sm" 
                  onClick={() => setActiveTab('plans')}
                  className={`h-7 w-7 p-0 rounded-md ${activeTab === 'plans' ? 'bg-background shadow-sm' : 'hover:bg-background/50'}`}
                  title="Plans"
                >
                  <Map className="h-3 w-3" />
                </Button>
                <Button 
                  variant={activeTab === 'audits' ? 'default' : 'ghost'} 
                  size="sm" 
                  onClick={() => setActiveTab('audits')}
                  className={`h-7 w-7 p-0 rounded-md ${activeTab === 'audits' ? 'bg-background shadow-sm' : 'hover:bg-background/50'}`}
                  title="Audits"
                >
                  <Search className="h-3 w-3" />
                </Button>
                <Button 
                  variant={activeTab === 'visual' ? 'default' : 'ghost'} 
                  size="sm" 
                  onClick={() => setActiveTab('visual')}
                  className={`h-7 w-7 p-0 rounded-md ${activeTab === 'visual' ? 'bg-background shadow-sm' : 'hover:bg-background/50'}`}
                  title="Identité Visuelle"
                >
                  <Palette className="h-3 w-3" />
                </Button>
                <Button 
                  variant={activeTab === 'media' ? 'default' : 'ghost'} 
                  size="sm" 
                  onClick={() => setActiveTab('media')}
                  className={`h-7 w-7 p-0 rounded-md ${activeTab === 'media' ? 'bg-background shadow-sm' : 'hover:bg-background/50'}`}
                  title="Médias"
                >
                  <Upload className="h-3 w-3" />
                </Button>
                <Button 
                  variant={activeTab === 'collaboration' ? 'default' : 'ghost'} 
                  size="sm" 
                  onClick={() => setActiveTab('collaboration')}
                  className={`h-7 w-7 p-0 rounded-md ${activeTab === 'collaboration' ? 'bg-background shadow-sm' : 'hover:bg-background/50'}`}
                  title="Équipe"
                >
                  <Users className="h-3 w-3" />
                </Button>
                <Button 
                  variant={activeTab === 'payment' ? 'default' : 'ghost'} 
                  size="sm" 
                  onClick={() => setActiveTab('payment')}
                  className={`h-7 w-7 p-0 rounded-md ${activeTab === 'payment' ? 'bg-background shadow-sm' : 'hover:bg-background/50'}`}
                  title="Abonnements"
                >
                  <CreditCard className="h-3 w-3" />
                </Button>
              </div>
            )}
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

      {/* Content Area with top margin for fixed header */}
      <div className="flex-1 flex flex-col mt-[60px]">
        {!isProjectSelected ? (
          <ProjectSelector />
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            {/* Tab Contents */}
            <div className="flex-1 overflow-hidden">
              <TabsContent value="dashboard" className="h-full m-0 data-[state=active]:flex data-[state=active]:flex-col">
                <div className="flex-1 px-6 py-4 overflow-y-auto">
                  <Dashboard />
                </div>
              </TabsContent>

              <TabsContent value="components" className="h-full m-0 data-[state=active]:flex data-[state=active]:flex-col">
                <Components />
              </TabsContent>

              <TabsContent value="plans" className="h-full m-0 data-[state=active]:flex data-[state=active]:flex-col">
                <PlanGenerator />
              </TabsContent>

              <TabsContent value="audits" className="h-full m-0 data-[state=active]:flex data-[state=active]:flex-col">
                <UXAudit />
              </TabsContent>

              <TabsContent value="visual" className="h-full m-0 data-[state=active]:flex data-[state=active]:flex-col">
                <VisualIdentity />
              </TabsContent>

              <TabsContent value="media" className="h-full m-0 data-[state=active]:flex data-[state=active]:flex-col">
                <MediaUpload />
              </TabsContent>

              <TabsContent value="collaboration" className="h-full m-0 data-[state=active]:flex data-[state=active]:flex-col">
                <Collaboration />
              </TabsContent>

              <TabsContent value="payment" className="h-full m-0 data-[state=active]:flex data-[state=active]:flex-col">
                <div className="flex-1 px-6 py-4 overflow-y-auto">
                  <Payment />
                </div>
              </TabsContent>
            </div>
          </Tabs>
        )}
      </div>
    </div>
  );
};

export default MainLayout;