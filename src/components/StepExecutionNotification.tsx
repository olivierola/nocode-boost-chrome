import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, Clock, SkipForward, Repeat } from 'lucide-react';

interface StepResult {
  status: 'success' | 'error' | 'ambiguous';
  message: string;
  suggestion?: string;
}

interface StepExecutionNotificationProps {
  isOpen: boolean;
  step: {
    id: string;
    titre: string;
    description: string;
    prompt: string;
  } | null;
  result: StepResult | null;
  mode: 'manual' | 'auto' | 'full-auto';
  onContinue: () => void;
  onRetry: () => void;
  onSkip: () => void;
  onClose: () => void;
}

const StepExecutionNotification = ({
  isOpen,
  step,
  result,
  mode,
  onContinue,
  onRetry,
  onSkip,
  onClose
}: StepExecutionNotificationProps) => {
  const [autoCloseTimer, setAutoCloseTimer] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen && mode === 'auto' && result?.status === 'success') {
      // Auto-close after 3 seconds for successful steps in auto mode
      const timer = setTimeout(() => {
        onContinue();
      }, 3000);
      setAutoCloseTimer(3);
      
      const interval = setInterval(() => {
        setAutoCloseTimer(prev => {
          if (prev && prev <= 1) {
            clearInterval(interval);
            return null;
          }
          return prev ? prev - 1 : null;
        });
      }, 1000);

      return () => {
        clearTimeout(timer);
        clearInterval(interval);
      };
    }
  }, [isOpen, mode, result, onContinue]);

  if (!isOpen || !step || !result) return null;

  const getStatusIcon = () => {
    switch (result.status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'ambiguous':
        return <Clock className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusColor = () => {
    switch (result.status) {
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      case 'ambiguous':
        return 'border-yellow-200 bg-yellow-50';
    }
  };

  const getStatusTitle = () => {
    switch (result.status) {
      case 'success':
        return 'Étape réussie';
      case 'error':
        return 'Erreur détectée';
      case 'ambiguous':
        return 'Résultat ambigu';
    }
  };

  const shouldShowControls = mode === 'manual' || result.status !== 'success';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getStatusIcon()}
            {getStatusTitle()}
          </DialogTitle>
          <DialogDescription>
            Résultat de l'exécution de l'étape
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Step Info */}
          <Card className={`${getStatusColor()}`}>
            <CardContent className="p-4">
              <div className="space-y-2">
                <h4 className="text-sm font-medium">{step.titre}</h4>
                <p className="text-xs text-muted-foreground">{step.description}</p>
              </div>
            </CardContent>
          </Card>

          {/* Result */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Résultat:</span>
              <Badge variant={result.status === 'success' ? 'default' : 'destructive'}>
                {result.status === 'success' ? 'Succès' : result.status === 'error' ? 'Erreur' : 'Ambigu'}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{result.message}</p>
            
            {result.suggestion && (
              <div className="mt-3 p-3 bg-muted rounded-md">
                <p className="text-xs font-medium mb-1">Suggestion d'amélioration:</p>
                <p className="text-xs text-muted-foreground">{result.suggestion}</p>
              </div>
            )}
          </div>

          {/* Auto-close timer */}
          {autoCloseTimer && (
            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                Continuation automatique dans {autoCloseTimer}s...
              </p>
            </div>
          )}

          {/* Controls */}
          {shouldShowControls && (
            <div className="flex gap-2">
              {result.status === 'success' ? (
                <Button onClick={onContinue} className="flex-1">
                  <SkipForward className="h-4 w-4 mr-2" />
                  Continuer
                </Button>
              ) : (
                <>
                  <Button onClick={onRetry} variant="outline" className="flex-1">
                    <Repeat className="h-4 w-4 mr-2" />
                    Réessayer
                  </Button>
                  <Button onClick={onSkip} variant="outline" className="flex-1">
                    <SkipForward className="h-4 w-4 mr-2" />
                    Ignorer
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StepExecutionNotification;