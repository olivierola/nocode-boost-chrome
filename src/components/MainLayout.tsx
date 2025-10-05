import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useProjectContext } from '@/hooks/useProjectContext';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut, Home, Code, Sparkles, Scan, Image, Users, FolderOpen, X, CreditCard, BookmarkPlus, MessagesSquare, User, Moon, Sun, Calendar as CalendarIcon, Settings, Zap, HelpCircle, Keyboard, Bell } from 'lucide-react';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';
import logo from '@/assets/logo.png';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';

// Import all components
import Dashboard from '@/pages/Dashboard';
import Components from '@/pages/Components';
import ComponentsSaved from '@/pages/ComponentsSaved';
import PlanGenerator from '@/pages/PlanGenerator';
import UXAudit from '@/pages/UXAudit';
import MediaUpload from '@/pages/MediaUpload';
import Collaboration from '@/pages/Collaboration';
import Payment from '@/pages/Payment';
import Posts from '@/pages/Posts';
import Calendar from '@/pages/Calendar';
import NotificationCenter from '@/components/NotificationCenter';
import ProjectSelector from '@/components/ProjectSelector';
import { useCalendarEvents } from '@/hooks/useCalendarEvents';

const MainLayout = () => {
  const { user, signOut } = useAuth();
  const { selectedProject, clearProject, isProjectSelected } = useProjectContext();
  const { theme, setTheme } = useTheme();
  const { upcomingEventsCount } = useCalendarEvents();
  const { unreadCount } = useRealtimeNotifications();
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
    <div className="w-[750px] h-[600px] bg-background flex flex-col relative">
      <NotificationCenter />
      
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/3 right-1/4 w-48 h-48 bg-accent/10 rounded-full blur-2xl animate-pulse delay-1000" />
        <div className="absolute top-2/3 left-1/2 w-32 h-32 bg-muted/20 rounded-full blur-xl animate-pulse delay-500" />
      </div>
      
      {/* Fixed Header */}
      <header className="border-b border-border bg-header flex-shrink-0 fixed top-0 left-0 right-0 z-50 w-[750px]">
        <div className="px-6 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img src={logo} alt="Logo" className="h-8 w-8 object-contain" />
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

          {/* Centered Tab Navigation */}
          {isProjectSelected && (
            <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center gap-1 bg-header p-1.5 rounded-2xl border border-border">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setActiveTab('dashboard')}
                className={`h-7 w-7 p-0 rounded-xl hover:bg-transparent ${activeTab === 'dashboard' ? 'text-[#8B1538]' : 'text-muted-foreground'}`}
                title="Dashboard"
              >
                <Home className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setActiveTab('plans')}
                className={`h-7 w-7 p-0 rounded-xl hover:bg-transparent ${activeTab === 'plans' ? 'text-[#8B1538]' : 'text-muted-foreground'}`}
                title="Plans"
              >
                <Sparkles className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setActiveTab('components')}
                className={`h-7 w-7 p-0 rounded-xl hover:bg-transparent ${activeTab === 'components' ? 'text-[#8B1538]' : 'text-muted-foreground'}`}
                title="21st.dev"
              >
                <Code className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setActiveTab('saved-components')}
                className={`h-7 w-7 p-0 rounded-xl hover:bg-transparent ${activeTab === 'saved-components' ? 'text-[#8B1538]' : 'text-muted-foreground'}`}
                title="Composants sauvés"
              >
                <BookmarkPlus className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setActiveTab('media')}
                className={`h-7 w-7 p-0 rounded-xl hover:bg-transparent ${activeTab === 'media' ? 'text-[#8B1538]' : 'text-muted-foreground'}`}
                title="Médias"
              >
                <Image className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setActiveTab('posts')}
                className={`h-7 w-7 p-0 rounded-xl hover:bg-transparent ${activeTab === 'posts' ? 'text-[#8B1538]' : 'text-muted-foreground'}`}
                title="Posts"
              >
                <MessagesSquare className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setActiveTab('collaboration')}
                className={`h-7 w-7 p-0 rounded-xl hover:bg-transparent ${activeTab === 'collaboration' ? 'text-[#8B1538]' : 'text-muted-foreground'}`}
                title="Équipe"
              >
                <Users className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setActiveTab('payment')}
                className={`h-7 w-7 p-0 rounded-xl hover:bg-transparent ${activeTab === 'payment' ? 'text-[#8B1538]' : 'text-muted-foreground'}`}
                title="Abonnements"
              >
                <CreditCard className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setActiveTab('calendar')}
                className={`h-7 w-7 p-0 rounded-xl hover:bg-transparent relative ${activeTab === 'calendar' ? 'text-[#8B1538]' : 'text-muted-foreground'}`}
                title="Calendrier"
              >
                <CalendarIcon className="h-4 w-4" />
                {upcomingEventsCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]"
                  >
                    {upcomingEventsCount}
                  </Badge>
                )}
              </Button>
            </div>
          )}
          
          {/* Theme Toggle, Notifications and User Avatar */}
          <div className="flex items-center gap-2">
            <ThemeSwitcher />
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="h-8 w-8 p-0"
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 relative"
              title="Notifications"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]"
                >
                  {unreadCount}
                </Badge>
              )}
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.user_metadata?.avatar_url} />
                    <AvatarFallback className="text-xs">
                      {getInitials(getUserName())}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64 bg-card border border-border shadow-lg" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{getUserName()}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                <DropdownMenuItem onClick={() => setActiveTab('payment')}>
                  <Zap className="mr-2 h-4 w-4 text-primary" />
                  <span>Upgrade Plan</span>
                  <Badge variant="default" className="ml-auto text-xs">Pro</Badge>
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem onClick={() => console.log('Profil')}>
                  <User className="mr-2 h-4 w-4" />
                  <span>Mon Profil</span>
                </DropdownMenuItem>
                
                <DropdownMenuItem onClick={() => console.log('Paramètres')}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Paramètres</span>
                </DropdownMenuItem>
                
                <DropdownMenuItem onClick={() => setActiveTab('calendar')}>
                  <Bell className="mr-2 h-4 w-4" />
                  <span>Notifications</span>
                  {upcomingEventsCount > 0 && (
                    <Badge variant="destructive" className="ml-auto text-xs">
                      {upcomingEventsCount}
                    </Badge>
                  )}
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem onClick={() => window.open('https://docs.example.com', '_blank')}>
                  <HelpCircle className="mr-2 h-4 w-4" />
                  <span>Aide & Support</span>
                </DropdownMenuItem>
                
                <DropdownMenuItem onClick={() => console.log('Raccourcis')}>
                  <Keyboard className="mr-2 h-4 w-4" />
                  <span>Raccourcis clavier</span>
                  <span className="ml-auto text-xs text-muted-foreground">⌘K</span>
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Se déconnecter</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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

              <TabsContent value="plans" className="h-full m-0 data-[state=active]:flex data-[state=active]:flex-col">
                <PlanGenerator />
              </TabsContent>

              <TabsContent value="audits" className="h-full m-0 data-[state=active]:flex data-[state=active]:flex-col">
                <UXAudit />
              </TabsContent>

              <TabsContent value="components" className="h-full m-0 data-[state=active]:flex data-[state=active]:flex-col">
                <Components />
              </TabsContent>

              <TabsContent value="saved-components" className="h-full m-0 data-[state=active]:flex data-[state=active]:flex-col">
                <ComponentsSaved />
              </TabsContent>

              <TabsContent value="media" className="h-full m-0 data-[state=active]:flex data-[state=active]:flex-col">
                <MediaUpload />
              </TabsContent>

              <TabsContent value="posts" className="h-full m-0 data-[state=active]:flex data-[state=active]:flex-col">
                <div className="flex-1 px-6 py-4 overflow-y-auto">
                  <Posts />
                </div>
              </TabsContent>

              <TabsContent value="collaboration" className="h-full m-0 data-[state=active]:flex data-[state=active]:flex-col">
                <Collaboration />
              </TabsContent>

              <TabsContent value="payment" className="h-full m-0 data-[state=active]:flex data-[state=active]:flex-col">
                <div className="flex-1 px-6 py-4 overflow-y-auto">
                  <Payment />
                </div>
              </TabsContent>

              <TabsContent value="calendar" className="h-full m-0 data-[state=active]:flex data-[state=active]:flex-col">
                <Calendar />
              </TabsContent>
            </div>
          </Tabs>
        )}
      </div>
    </div>
  );
};

export default MainLayout;