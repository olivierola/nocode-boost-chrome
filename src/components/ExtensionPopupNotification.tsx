import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, CheckCircle, AlertCircle, Info, X } from 'lucide-react';
import { RealtimeNotification } from '@/hooks/useRealtimeNotifications';
import { motion, AnimatePresence } from 'framer-motion';

interface ExtensionPopupNotificationProps {
  notification: RealtimeNotification;
  onClose: () => void;
  onMarkAsRead: () => void;
  position?: 'top-right' | 'bottom-right';
}

const ExtensionPopupNotification = ({ 
  notification, 
  onClose, 
  onMarkAsRead,
  position = 'bottom-right'
}: ExtensionPopupNotificationProps) => {
  const [isVisible, setIsVisible] = useState(true);

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

  const getPositionClasses = () => {
    switch (position) {
      case 'top-right':
        return 'fixed top-4 right-4 z-[9999]';
      case 'bottom-right':
      default:
        return 'fixed bottom-20 right-4 z-[9999]';
    }
  };

  const getNotificationColors = (type: string) => {
    switch (type) {
      case 'success':
        return 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950';
      case 'error':
        return 'border-destructive/20 bg-destructive/5 dark:border-destructive dark:bg-destructive/10';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950';
      default:
        return 'border-border bg-card';
    }
  };

  // Auto-hide after 5 seconds for success and info notifications
  useEffect(() => {
    if (notification.type === 'success' || notification.type === 'info') {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 300); // Wait for animation to complete
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [notification.type, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  const handleClick = () => {
    if (!notification.read) {
      onMarkAsRead();
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.9 }}
          transition={{ duration: 0.3 }}
          className={getPositionClasses()}
        >
          <Card 
            className={`w-80 shadow-lg cursor-pointer ${getNotificationColors(notification.type)}`}
            onClick={handleClick}
          >
            <div className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  {getNotificationIcon(notification.type)}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-foreground">
                      {notification.title}
                    </h4>
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
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClose();
                  }}
                  className="h-6 w-6 p-0 hover:bg-background/80"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ExtensionPopupNotification;