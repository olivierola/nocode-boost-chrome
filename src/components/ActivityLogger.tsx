import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, CheckCircle, AlertCircle, Play, Upload, Palette, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface ActivityLog {
  id: string;
  action: string;
  details: any;
  timestamp: string;
  user_id: string;
}

const ActivityLogger = () => {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchActivities = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(10);

      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const logActivity = async (action: string, details: any = {}) => {
    if (!user) return;

    try {
      await supabase
        .from('activity_logs')
        .insert({
          action,
          details,
          user_id: user.id
        });
      
      fetchActivities(); // Refresh the list
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'plan_generated':
      case 'plan_executed':
        return <Play className="h-3 w-3" />;
      case 'component_saved':
        return <CheckCircle className="h-3 w-3" />;
      case 'audit_created':
        return <AlertCircle className="h-3 w-3" />;
      case 'media_uploaded':
        return <Upload className="h-3 w-3" />;
      case 'visual_identity_generated':
        return <Palette className="h-3 w-3" />;
      case 'collaborator_added':
        return <Users className="h-3 w-3" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'plan_generated':
        return 'Plan généré';
      case 'plan_executed':
        return 'Plan exécuté';
      case 'component_saved':
        return 'Composant sauvegardé';
      case 'audit_created':
        return 'Audit créé';
      case 'media_uploaded':
        return 'Média uploadé';
      case 'visual_identity_generated':
        return 'Identité visuelle générée';
      case 'collaborator_added':
        return 'Collaborateur ajouté';
      default:
        return action;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'plan_generated':
      case 'plan_executed':
        return 'bg-blue-100 text-blue-800';
      case 'component_saved':
        return 'bg-green-100 text-green-800';
      case 'audit_created':
        return 'bg-yellow-100 text-yellow-800';
      case 'media_uploaded':
        return 'bg-purple-100 text-purple-800';
      case 'visual_identity_generated':
        return 'bg-pink-100 text-pink-800';
      case 'collaborator_added':
        return 'bg-indigo-100 text-indigo-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins}min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays}j`;
    
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short'
    });
  };

  useEffect(() => {
    fetchActivities();
  }, [user]);

  // Expose logActivity function globally for other components to use
  useEffect(() => {
    (window as any).logActivity = logActivity;
    return () => {
      delete (window as any).logActivity;
    };
  }, [user]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Activité récente
        </CardTitle>
        <CardDescription className="text-xs">
          Historique de vos actions
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {loading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-6 h-6 bg-muted rounded-full animate-pulse" />
                <div className="flex-1 space-y-1">
                  <div className="h-3 bg-muted rounded animate-pulse" />
                  <div className="h-2 bg-muted rounded w-2/3 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : activities.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            Aucune activité récente
          </p>
        ) : (
          <ScrollArea className="h-[200px]">
            <div className="space-y-3">
              {activities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${getActionColor(activity.action)}`}>
                    {getActionIcon(activity.action)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium truncate">
                        {getActionLabel(activity.action)}
                      </span>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {formatTimestamp(activity.timestamp)}
                      </span>
                    </div>
                    {activity.details && Object.keys(activity.details).length > 0 && (
                      <p className="text-xs text-muted-foreground truncate">
                        {activity.details.projectName || activity.details.name || activity.details.message || ''}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default ActivityLogger;