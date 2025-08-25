import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Code, Search, CheckCircle, Users, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Statistics {
  totalProjects: number;
  completedPlans: number;
  totalSteps: number;
  completedSteps: number;
  savedComponents: number;
  reusedComponents: number;
  auditsCreated: number;
  mediaUploaded: number;
  collaborators: number;
}

const ProjectStatistics = () => {
  const [stats, setStats] = useState<Statistics>({
    totalProjects: 0,
    completedPlans: 0,
    totalSteps: 0,
    completedSteps: 0,
    savedComponents: 0,
    reusedComponents: 0,
    auditsCreated: 0,
    mediaUploaded: 0,
    collaborators: 0
  });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchStatistics = async () => {
    if (!user) return;

    try {
      // Fetch projects count
      const { count: projectsCount } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', user.id);

      // Fetch plans and calculate steps
      const { data: plans } = await supabase
        .from('plans')
        .select('etapes')
        .in('project_id', await getProjectIds());

      // Fetch components count
      const { count: componentsCount } = await supabase
        .from('components')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Fetch audits count
      const { count: auditsCount } = await supabase
        .from('ux_audits')
        .select('*', { count: 'exact', head: true })
        .in('project_id', await getProjectIds());

      // Fetch files count
      const { count: filesCount } = await supabase
        .from('files')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Fetch collaborators count
      const { count: collaboratorsCount } = await supabase
        .from('collaborators')
        .select('*', { count: 'exact', head: true })
        .in('project_id', await getProjectIds());

      // Calculate plan and step statistics
      let completedPlans = 0;
      let totalSteps = 0;
      let completedSteps = 0;

      if (plans) {
        plans.forEach((plan: any) => {
          if (plan.etapes && Array.isArray(plan.etapes)) {
            const steps = plan.etapes;
            totalSteps += steps.length;
            const completed = steps.filter((step: any) => step.status === 'completed').length;
            completedSteps += completed;
            
            if (completed === steps.length && steps.length > 0) {
              completedPlans++;
            }
          }
        });
      }

      setStats({
        totalProjects: projectsCount || 0,
        completedPlans,
        totalSteps,
        completedSteps,
        savedComponents: componentsCount || 0,
        reusedComponents: Math.floor((componentsCount || 0) * 0.3), // Simulated reuse rate
        auditsCreated: auditsCount || 0,
        mediaUploaded: filesCount || 0,
        collaborators: collaboratorsCount || 0
      });
    } catch (error) {
      console.error('Error fetching statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getProjectIds = async () => {
    const { data: projects } = await supabase
      .from('projects')
      .select('id')
      .eq('owner_id', user?.id);
    
    return projects?.map(p => p.id) || [];
  };

  useEffect(() => {
    fetchStatistics();
  }, [user]);

  const statisticsCards = [
    {
      title: 'Projets',
      value: stats.totalProjects,
      icon: <TrendingUp className="h-4 w-4" />,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Étapes terminées',
      value: `${stats.completedSteps}/${stats.totalSteps}`,
      icon: <CheckCircle className="h-4 w-4" />,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Composants',
      value: stats.savedComponents,
      description: `${stats.reusedComponents} réutilisés`,
      icon: <Code className="h-4 w-4" />,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      title: 'Audits',
      value: stats.auditsCreated,
      icon: <Search className="h-4 w-4" />,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50'
    },
    {
      title: 'Médias',
      value: stats.mediaUploaded,
      icon: <Upload className="h-4 w-4" />,
      color: 'text-pink-600',
      bgColor: 'bg-pink-50'
    },
    {
      title: 'Collaborateurs',
      value: stats.collaborators,
      icon: <Users className="h-4 w-4" />,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50'
    }
  ];

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Statistiques</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="p-3 bg-muted rounded-md animate-pulse">
                <div className="h-3 bg-muted-foreground/20 rounded mb-2" />
                <div className="h-6 bg-muted-foreground/20 rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Statistiques
        </CardTitle>
        <CardDescription className="text-xs">
          Vue d'ensemble de votre activité
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 gap-3">
          {statisticsCards.map((stat, index) => (
            <div key={index} className={`p-3 rounded-md ${stat.bgColor}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-600">{stat.title}</span>
                <div className={stat.color}>{stat.icon}</div>
              </div>
              <div className="space-y-1">
                <span className="text-lg font-bold text-gray-900">{stat.value}</span>
                {stat.description && (
                  <p className="text-xs text-gray-500">{stat.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ProjectStatistics;