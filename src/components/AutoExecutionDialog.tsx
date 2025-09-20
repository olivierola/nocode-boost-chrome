import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, SkipForward, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Step {
  id: string;
  titre: string;
  description: string;
  prompt: string;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  sousEtapes?: Step[];
}

interface AutoExecutionDialogProps {
  steps: Step[];
  onExecute: (mode: 'manual' | 'auto' | 'full-auto') => void;
  isExecuting: boolean;
  currentStep?: number;
  children: React.ReactNode;
}

const AutoExecutionDialog = ({ steps = [], onExecute, isExecuting, currentStep = 0, children }: AutoExecutionDialogProps) => {
  const [executionMode, setExecutionMode] = useState<'manual' | 'auto' | 'full-auto'>('manual');
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const handleStartExecution = () => {
    onExecute(executionMode);
    setOpen(false);
    toast({
      title: "Exécution démarrée",
      description: `Mode ${executionMode === 'manual' ? 'manuel' : executionMode === 'auto' ? 'automatique' : 'automatique complet'} activé`,
    });
  };

  const getExecutionModeDescription = (mode: string) => {
    switch (mode) {
      case 'manual':
        return 'Validation manuelle après chaque étape avec popup de confirmation';
      case 'auto':
        return 'Exécution automatique avec popup de validation pour chaque étape réussie';
      case 'full-auto':
        return 'Exécution complète sans interruption jusqu\'à la fin du plan';
      default:
        return '';
    }
  };

  const completedSteps = Array.isArray(steps) ? steps.filter(s => s.status === 'completed').length : 0;
  const totalSteps = Array.isArray(steps) ? steps.length : 0;
  const progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="h-4 w-4" />
            Exécution automatique
          </DialogTitle>
          <DialogDescription>
            Choisissez le mode d'exécution pour automatiser votre plan
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Progress */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Progression</span>
                <Badge variant="outline">{progress}%</Badge>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {completedSteps} sur {totalSteps} étapes terminées
              </p>
            </CardContent>
          </Card>

          {/* Mode Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Mode d'exécution</Label>
            <RadioGroup value={executionMode} onValueChange={(value: any) => setExecutionMode(value)}>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <RadioGroupItem value="manual" id="manual" className="mt-1" />
                  <div className="space-y-1">
                    <Label htmlFor="manual" className="text-sm font-medium cursor-pointer">
                      Mode Manuel
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {getExecutionModeDescription('manual')}
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <RadioGroupItem value="auto" id="auto" className="mt-1" />
                  <div className="space-y-1">
                    <Label htmlFor="auto" className="text-sm font-medium cursor-pointer">
                      Mode Automatique
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {getExecutionModeDescription('auto')}
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <RadioGroupItem value="full-auto" id="full-auto" className="mt-1" />
                  <div className="space-y-1">
                    <Label htmlFor="full-auto" className="text-sm font-medium cursor-pointer">
                      Mode Automatique Complet
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {getExecutionModeDescription('full-auto')}
                    </p>
                  </div>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Current Step Preview */}
          {isExecuting && currentStep < steps.length && (
            <Card className="border-primary">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="h-3 w-3" />
                  Étape en cours
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">{steps[currentStep]?.titre}</h4>
                  <p className="text-xs text-muted-foreground">{steps[currentStep]?.description}</p>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-2">
            <Button 
              onClick={handleStartExecution} 
              disabled={isExecuting}
              className="flex-1"
            >
              {isExecuting ? (
                <>
                  <Pause className="h-4 w-4 mr-2" />
                  En cours...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Démarrer
                </>
              )}
            </Button>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AutoExecutionDialog;