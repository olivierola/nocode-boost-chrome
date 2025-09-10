import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Play, Pause, SkipForward, CheckCircle, AlertCircle, Clock, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ExecutionStep {
  id: string;
  titre: string;
  description: string;
  prompt: string;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  result?: {
    status: 'success' | 'error' | 'ambiguous';
    message: string;
    suggestion?: string;
  };
}

interface ExecutionProgressDialogProps {
  isOpen: boolean;
  onClose: () => void;
  steps: ExecutionStep[];
  currentStepIndex: number;
  mode: 'manual' | 'auto' | 'full-auto';
  onPause: () => void;
  onResume: () => void;
  onSkip: () => void;
  onRetry: () => void;
  isExecuting: boolean;
}

const ExecutionProgressDialog = ({
  isOpen,
  onClose,
  steps,
  currentStepIndex,
  mode,
  onPause,
  onResume,
  onSkip,
  onRetry,
  isExecuting
}: ExecutionProgressDialogProps) => {
  const { toast } = useToast();
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  useEffect(() => {
    if (isExecuting && currentStepIndex < steps.length) {
      const currentStep = steps[currentStepIndex];
      addLog(`Exécution de l'étape: ${currentStep.titre}`);
    }
  }, [currentStepIndex, isExecuting]);

  const getStepIcon = (step: ExecutionStep, index: number) => {
    if (index < currentStepIndex) {
      return step.status === 'completed' ? 
        <CheckCircle className="h-4 w-4 text-green-500" /> :
        <AlertCircle className="h-4 w-4 text-red-500" />;
    } else if (index === currentStepIndex && isExecuting) {
      return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
    } else {
      return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStepColor = (step: ExecutionStep, index: number) => {
    if (index < currentStepIndex) {
      return step.status === 'completed' ? 'border-green-200' : 'border-red-200';
    } else if (index === currentStepIndex) {
      return 'border-blue-200 bg-blue-50';
    } else {
      return 'border-gray-200';
    }
  };

  const progress = steps.length > 0 ? Math.round((currentStepIndex / steps.length) * 100) : 0;
  const completedSteps = steps.filter(s => s.status === 'completed').length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="h-4 w-4" />
            Exécution automatique du plan
          </DialogTitle>
          <DialogDescription>
            Mode: {mode === 'manual' ? 'Manuel' : mode === 'auto' ? 'Automatique' : 'Automatique complet'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Progress Overview */}
          <Card>
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Progression</span>
                  <span>{completedSteps}/{steps.length} étapes</span>
                </div>
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {isExecuting ? 'Exécution en cours...' : 'En pause'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Controls */}
          <div className="flex gap-2">
            {isExecuting ? (
              <Button onClick={onPause} variant="outline" size="sm">
                <Pause className="h-4 w-4 mr-2" />
                Pause
              </Button>
            ) : (
              <Button onClick={onResume} size="sm">
                <Play className="h-4 w-4 mr-2" />
                Reprendre
              </Button>
            )}
            
            {currentStepIndex < steps.length && (
              <>
                <Button onClick={onSkip} variant="outline" size="sm">
                  <SkipForward className="h-4 w-4 mr-2" />
                  Ignorer
                </Button>
                <Button onClick={onRetry} variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Réessayer
                </Button>
              </>
            )}
          </div>

          {/* Steps List */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Étapes</h3>
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {(steps || []).map((step, index) => (
                    <Card key={step.id} className={`${getStepColor(step, index)}`}>
                      <CardContent className="p-3">
                        <div className="flex items-start gap-2">
                          {getStepIcon(step, index)}
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-medium truncate">{step.titre}</h4>
                            <p className="text-xs text-muted-foreground truncate">
                              {step.description}
                            </p>
                            {step.result && (
                              <div className="mt-2">
                                <Badge 
                                  variant={step.result.status === 'success' ? 'default' : 'destructive'}
                                  className="text-xs"
                                >
                                  {step.result.status === 'success' ? 'Succès' : 
                                   step.result.status === 'error' ? 'Erreur' : 'Ambigu'}
                                </Badge>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {step.result.message}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Logs */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Logs d'exécution</h3>
              <ScrollArea className="h-[300px]">
                <div className="space-y-1">
                  {(logs || []).map((log, index) => (
                    <div key={index} className="text-xs bg-muted p-2 rounded font-mono">
                      {log}
                    </div>
                  ))}
                  {logs.length === 0 && (
                    <p className="text-xs text-muted-foreground p-2">
                      Aucun log disponible
                    </p>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExecutionProgressDialog;