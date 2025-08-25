import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useProjectContext } from '@/hooks/useProjectContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { LogOut, Home, Code, Map, Search, Palette, Upload, Users, FolderOpen, X } from 'lucide-react';

// Import all components
import Dashboard from '@/pages/Dashboard';
import Components from '@/pages/Components';
import PlanGenerator from '@/pages/PlanGenerator';
import UXAudit from '@/pages/UXAudit';
import VisualIdentity from '@/pages/VisualIdentity';
import MediaUpload from '@/pages/MediaUpload';
import Collaboration from '@/pages/Collaboration';
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
      
      {/* Header */}
      <header className="border-b border-border bg-card flex-shrink-0">
        <div className="px-6 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h1 className="text-lg font-bold text-foreground">Super NoCode</h1>
            <span className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded-full">Extension</span>
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

      {/* Navigation Tabs */}
      {!isProjectSelected ? (
        <ProjectSelector />
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <div className="px-6 mt-4 overflow-x-auto">
            <TabsList className="grid w-full grid-cols-7 min-w-[700px]">
              <TabsTrigger value="dashboard" className="flex items-center gap-1 text-xs px-2">
                <Home className="h-3 w-3" />
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="components" className="flex items-center gap-1 text-xs px-2">
                <Code className="h-3 w-3" />
                Components
              </TabsTrigger>
              <TabsTrigger value="plans" className="flex items-center gap-1 text-xs px-2">
                <Map className="h-3 w-3" />
                Plans
              </TabsTrigger>
              <TabsTrigger value="audits" className="flex items-center gap-1 text-xs px-2">
                <Search className="h-3 w-3" />
                Audits
              </TabsTrigger>
              <TabsTrigger value="visual" className="flex items-center gap-1 text-xs px-2">
                <Palette className="h-3 w-3" />
                Identité
              </TabsTrigger>
              <TabsTrigger value="media" className="flex items-center gap-1 text-xs px-2">
                <Upload className="h-3 w-3" />
                Médias
              </TabsTrigger>
              <TabsTrigger value="collaboration" className="flex items-center gap-1 text-xs px-2">
                <Users className="h-3 w-3" />
                Équipe
              </TabsTrigger>
            </TabsList>
          </div>

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
          </div>
        </Tabs>
      )}
    </div>
  );
};

export default MainLayout;