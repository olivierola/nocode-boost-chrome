import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, CheckCircle, AlertCircle, Info, X, Trash2 } from 'lucide-react';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';
import ExtensionPopupNotification from './ExtensionPopupNotification';

const NotificationCenter = () => {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification
  } = useRealtimeNotifications();
  
  const [popupNotification, setPopupNotification] = useState<any>(null);

  // Show popup for new notifications
  useEffect(() => {
    const latestNotification = notifications[0];
    if (latestNotification && !latestNotification.read) {
      setPopupNotification(latestNotification);
    }
  }, [notifications]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Info className="h-4 w-4 text-primary" />;
    }
  };

  const getNotificationColor = (type: string, isRead: boolean) => {
    const baseClasses = isRead ? 'opacity-60' : '';
    switch (type) {
      case 'success':
        return `border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950 ${baseClasses}`;
      case 'error':
        return `border-destructive/20 bg-destructive/5 dark:border-destructive dark:bg-destructive/10 ${baseClasses}`;
      case 'warning':
        return `border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950 ${baseClasses}`;
      default:
        return `border-border bg-card ${baseClasses}`;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins}min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };


  if (notifications.length === 0) {
    return null;
  }

  return (
    <>
      <Card className="absolute top-4 right-4 w-80 z-50 shadow-lg">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <CardTitle className="text-sm">Notifications</CardTitle>
              {unreadCount > 0 && (
                <Badge variant="default" className="text-xs">
                  {unreadCount}
                </Badge>
              )}
            </div>
            <div className="flex gap-2">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="text-xs"
                >
                  Tout marquer lu
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {(notifications || []).map((notification) => (
              <div
                key={notification.id}
                className={`p-3 rounded-md border cursor-pointer ${getNotificationColor(notification.type, notification.read)}`}
                onClick={() => !notification.read && markAsRead(notification.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-2 flex-1">
                    {getNotificationIcon(notification.type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className={`text-xs font-medium ${!notification.read ? 'font-semibold' : ''}`}>
                          {notification.title}
                        </h4>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-primary rounded-full" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {notification.message}
                      </p>
                      {notification.metadata?.step_index && notification.metadata?.total_steps && (
                        <div className="mt-2">
                          <div className="w-full bg-muted rounded-full h-1.5">
                            <div 
                              className="bg-primary h-1.5 rounded-full transition-all duration-300"
                              style={{ 
                                width: `${(notification.metadata.step_index / notification.metadata.total_steps) * 100}%` 
                              }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Étape {notification.metadata.step_index} sur {notification.metadata.total_steps}
                          </p>
                        </div>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-muted-foreground">
                          {formatTime(notification.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(notification.id);
                    }}
                    className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
            {notifications.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Aucune notification</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Popup notification for extension */}
      {popupNotification && (
        <ExtensionPopupNotification
          notification={popupNotification}
          onClose={() => setPopupNotification(null)}
          onMarkAsRead={() => {
            markAsRead(popupNotification.id);
            setPopupNotification(null);
          }}
        />
      )}
    </>
  );
};

export default NotificationCenter;