import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Lightbulb, Loader2, CheckCircle, Edit3, Save, Trash2, Play, MessageCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useProjects } from '@/hooks/useProjects';
import PromptEnhancer from '@/components/PromptEnhancer';
import AutoExecutionDialog from '@/components/AutoExecutionDialog';
import StepExecutionNotification from '@/components/StepExecutionNotification';
import PlanValidationChat from '@/components/PlanValidationChat';

interface ProjectPlan {
  id: string;
  project_id: string;
  status?: 'draft' | 'validated' | 'executing' | 'completed';
  etapes: Array<{
    id: string;
    titre: string;
    description: string;
    prompt: string;
    status: 'pending' | 'in_progress' | 'completed' | 'error';
    sousEtapes?: Array<{
      id: string;
      titre: string;
      description: string;
      prompt: string;
      status: 'pending' | 'in_progress' | 'completed' | 'error';
    }>;
  }>;
  created_at: string;
  updated_at: string;
}

interface StepResult {
  status: 'success' | 'error' | 'ambiguous';
  message: string;
  suggestion?: string;
}

const PlanGenerator = () => {
  const [projectIdea, setProjectIdea] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [plans, setPlans] = useState<ProjectPlan[]>([]);
  const [currentPlan, setCurrentPlan] = useState<ProjectPlan | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingStep, setEditingStep] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Auto-execution states
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionMode, setExecutionMode] = useState<'manual' | 'auto' | 'full-auto'>('manual');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [stepResult, setStepResult] = useState<StepResult | null>(null);
  const [showStepNotification, setShowStepNotification] = useState(false);
  const { user } = useAuth();
  const { projects } = useProjects();
  const { toast } = useToast();

  const fetchPlans = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPlans((data as unknown as ProjectPlan[]) || []);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les plans",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generatePlan = async () => {
    if (!projectIdea.trim() || !selectedProject) {
      toast({
        title: "Information manquante",
        description: "Veuillez sélectionner un projet et décrire votre idée",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      const project = projects.find(p => p.id === selectedProject);
      
      const { data, error } = await supabase.functions.invoke('generate-plan', {
        body: {
          projectIdea,
          projectName: project?.name || 'Projet'
        }
      });

      if (error) throw error;

      if (data?.success && data?.plan) {
        // Créer l'ID du plan
        const planId = crypto.randomUUID();
        const generatedPlan: ProjectPlan = {
          id: planId,
          project_id: selectedProject,
          status: 'draft',
          etapes: data.plan.etapes || [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        // Sauvegarder en base
        const { error: saveError } = await supabase
          .from('plans')
          .insert({
            id: planId,
            project_id: selectedProject,
            etapes: generatedPlan.etapes,
            status: 'draft'
          });

        if (saveError) throw saveError;

        setCurrentPlan(generatedPlan);
        
        // Log activity
        if ((window as any).logActivity) {
          (window as any).logActivity('plan_generated', {
            projectId: selectedProject,
            stepsCount: generatedPlan.etapes.length
          });
        }

        toast({
          title: "Plan généré",
          description: "Le plan de projet a été créé avec succès",
        });

        await fetchPlans();
      }
    } catch (error: any) {
      console.error('Error generating plan:', error);
      toast({
        title: "Erreur",
        description: "Impossible de générer le plan",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const updateStepStatus = async (stepId: string, newStatus: 'pending' | 'in_progress' | 'completed' | 'error', subStepId?: string) => {
    if (!currentPlan) return;

    const updatedPlan = { ...currentPlan };
    
    if (subStepId) {
      // Update sub-step
      const step = updatedPlan.etapes.find(s => s.id === stepId);
      if (step && step.sousEtapes) {
        const subStep = step.sousEtapes.find(ss => ss.id === subStepId);
        if (subStep) {
          subStep.status = newStatus;
        }
      }
    } else {
      // Update main step
      const step = updatedPlan.etapes.find(s => s.id === stepId);
      if (step) {
        step.status = newStatus;
      }
    }

    setCurrentPlan(updatedPlan);

    // Update in database
    try {
      const { error } = await supabase
        .from('plans')
        .update({ etapes: updatedPlan.etapes })
        .eq('id', updatedPlan.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating plan:', error);
    }
  };

  // Auto-execution functions
  const startAutoExecution = async (mode: 'manual' | 'auto' | 'full-auto') => {
    if (!currentPlan) return;
    
    setExecutionMode(mode);
    setIsExecuting(true);
    setCurrentStepIndex(0);
    
    // Log activity
    if ((window as any).logActivity) {
      (window as any).logActivity('plan_executed', {
        planId: currentPlan.id,
        mode,
        totalSteps: currentPlan.etapes.length
      });
    }
    
    executeNextStep();
  };

  const executeNextStep = async () => {
    if (!currentPlan || currentStepIndex >= currentPlan.etapes.length) {
      setIsExecuting(false);
      toast({
        title: "Plan terminé",
        description: "Toutes les étapes ont été exécutées",
      });
      return;
    }

    const currentStep = currentPlan.etapes[currentStepIndex];
    
    // Mark step as in progress
    await updateStepStatus(currentStep.id, 'in_progress');
    
    // Simulate step execution and AI analysis
    setTimeout(() => {
      analyzeStepResult(currentStep);
    }, 2000);
  };

  const analyzeStepResult = async (step: any) => {
    // Simulate AI analysis of the response
    const responses = [
      {
        status: 'success' as const,
        message: 'L\'étape a été exécutée avec succès. Le code généré correspond aux spécifications.',
        suggestion: undefined
      },
      {
        status: 'error' as const,
        message: 'Une erreur a été détectée dans le code généré. Syntaxe incorrecte.',
        suggestion: 'Corriger la syntaxe et réessayer avec des paramètres plus spécifiques.'
      },
      {
        status: 'ambiguous' as const,
        message: 'Le résultat est partiellement correct mais pourrait être amélioré.',
        suggestion: 'Ajouter plus de détails dans le prompt pour obtenir un résultat plus précis.'
      }
    ];

    const randomResult = responses[Math.floor(Math.random() * responses.length)];
    setStepResult(randomResult);

    // Update step status based on result
    const newStatus = randomResult.status === 'success' ? 'completed' : 
                     randomResult.status === 'error' ? 'error' : 'in_progress';
    
    await updateStepStatus(step.id, newStatus);
    
    // Show notification based on execution mode
    if (executionMode === 'full-auto' && randomResult.status === 'success') {
      // In full-auto mode, continue immediately if successful
      setTimeout(() => {
        setCurrentStepIndex(prev => prev + 1);
        executeNextStep();
      }, 1000);
    } else {
      // Show notification for manual, auto, or error cases
      setShowStepNotification(true);
    }
  };

  const handleStepContinue = () => {
    setShowStepNotification(false);
    setCurrentStepIndex(prev => prev + 1);
    executeNextStep();
  };

  const handleStepRetry = () => {
    setShowStepNotification(false);
    analyzeStepResult(currentPlan!.etapes[currentStepIndex]);
  };

  const handleStepSkip = () => {
    setShowStepNotification(false);
    setCurrentStepIndex(prev => prev + 1);
    executeNextStep();
  };

  const handlePlanValidation = () => {
    if (currentPlan) {
      setCurrentPlan(prev => prev ? { ...prev, status: 'validated' } : null);
    }
  };

  const handlePlanRegeneration = () => {
    generatePlan();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'in_progress': return 'bg-blue-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-300';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Terminé';
      case 'in_progress': return 'En cours';
      case 'error': return 'Erreur';
      default: return 'À faire';
    }
  };

  useEffect(() => {
    fetchPlans();
  }, [user]);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-card flex-shrink-0 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-foreground">Plan Generator</h2>
            <p className="text-xs text-muted-foreground">
              Générez des roadmaps structurées pour vos projets
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 py-4 overflow-y-auto">
        {!currentPlan ? (
          <div className="space-y-6">
            {/* Generator Form */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Lightbulb className="h-4 w-4" />
                  Générer un nouveau plan
                </CardTitle>
                <CardDescription className="text-xs">
                  Décrivez votre idée de projet pour générer un plan structuré
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="project-select">Projet</Label>
                  <Select value={selectedProject} onValueChange={setSelectedProject}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un projet" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="project-idea">Idée de projet</Label>
                  <Textarea
                    id="project-idea"
                    placeholder="Décrivez votre idée de projet en détail..."
                    value={projectIdea}
                    onChange={(e) => setProjectIdea(e.target.value)}
                    className="min-h-[100px]"
                  />
                </div>

                <Button 
                  onClick={generatePlan}
                  disabled={isGenerating || !projectIdea.trim() || !selectedProject}
                  className="w-full"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Génération en cours...
                    </>
                  ) : (
                    'Générer le plan'
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Existing Plans */}
            {plans.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-semibold">Plans existants</h2>
                <div className="grid gap-3">
                  {plans.map((plan) => {
                    const project = projects.find(p => p.id === plan.project_id);
                    const completedSteps = plan.etapes.filter(e => e.status === 'completed').length;
                    const totalSteps = plan.etapes.length;
                    
                    return (
                      <Card key={plan.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setCurrentPlan(plan)}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="text-sm font-medium">{project?.name || 'Projet inconnu'}</h3>
                              <p className="text-xs text-muted-foreground">
                                {completedSteps}/{totalSteps} étapes terminées
                              </p>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {Math.round((completedSteps / totalSteps) * 100)}%
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 h-full">
            {/* Plan Details */}
            <div className="space-y-4">
              {/* Plan Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold">Plan du projet</h2>
                  <p className="text-xs text-muted-foreground">
                    {projects.find(p => p.id === currentPlan.project_id)?.name}
                  </p>
                  {currentPlan.status && (
                    <Badge 
                      variant={currentPlan.status === 'validated' ? 'default' : 'secondary'}
                      className="text-xs mt-1"
                    >
                      {currentPlan.status === 'validated' ? 'Validé' : 
                       currentPlan.status === 'draft' ? 'Brouillon' : currentPlan.status}
                    </Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  {currentPlan.status === 'validated' && (
                    <AutoExecutionDialog
                      steps={currentPlan.etapes}
                      onExecute={startAutoExecution}
                      isExecuting={isExecuting}
                      currentStep={currentStepIndex}
                    >
                      <Button size="sm" disabled={isExecuting}>
                        <Play className="h-3 w-3 mr-1" />
                        Exécuter
                      </Button>
                    </AutoExecutionDialog>
                  )}
                  <Button variant="outline" size="sm" onClick={() => setCurrentPlan(null)}>
                    Retour
                  </Button>
                </div>
              </div>

            {/* Steps */}
            <div className="space-y-3">
              {currentPlan.etapes.map((step, index) => (
                <Card key={step.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs ${getStatusColor(step.status)}`}>
                            {step.status === 'completed' ? <CheckCircle className="h-3 w-3" /> : index + 1}
                          </div>
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-sm">{step.titre}</CardTitle>
                          <CardDescription className="text-xs mt-1">
                            {step.description}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {getStatusLabel(step.status)}
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  {step.sousEtapes && step.sousEtapes.length > 0 && (
                    <CardContent className="pt-0">
                      <div className="space-y-2 ml-9">
                        {step.sousEtapes.map((subStep) => (
                          <div key={subStep.id} className="flex items-start gap-3 p-2 bg-muted rounded-md">
                            <div className={`w-4 h-4 rounded-full ${getStatusColor(subStep.status)}`} />
                            <div className="flex-1">
                              <h4 className="text-xs font-medium">{subStep.titre}</h4>
                              <p className="text-xs text-muted-foreground">{subStep.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          </div>

          {/* Chat de validation */}
          <div className="h-full">
            <PlanValidationChat
              planId={currentPlan.id}
              plan={currentPlan}
              onValidate={handlePlanValidation}
              onRegenerate={handlePlanRegeneration}
              isValidated={currentPlan.status === 'validated'}
            />
          </div>
        </div>
        )}

        {/* Step Execution Notification */}
        <StepExecutionNotification
          isOpen={showStepNotification}
          step={currentPlan?.etapes[currentStepIndex] || null}
          result={stepResult}
          mode={executionMode}
          onContinue={handleStepContinue}
          onRetry={handleStepRetry}
          onSkip={handleStepSkip}
          onClose={() => setShowStepNotification(false)}
        />
      </div>
    </div>
  );
};

export default PlanGenerator;
