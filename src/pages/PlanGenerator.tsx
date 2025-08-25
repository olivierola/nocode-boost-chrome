import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Lightbulb, Loader2, CheckCircle, Edit3, Save, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useProjects } from '@/hooks/useProjects';
import PromptEnhancer from '@/components/PromptEnhancer';

interface ProjectPlan {
  id: string;
  project_id: string;
  etapes: Array<{
    id: string;
    titre: string;
    description: string;
    prompt: string;
    status: 'pending' | 'in_progress' | 'completed';
    sousEtapes?: Array<{
      id: string;
      titre: string;
      description: string;
      prompt: string;
      status: 'pending' | 'in_progress' | 'completed';
    }>;
  }>;
  created_at: string;
}

const PlanGenerator = () => {
  const [projectIdea, setProjectIdea] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [plans, setPlans] = useState<ProjectPlan[]>([]);
  const [currentPlan, setCurrentPlan] = useState<ProjectPlan | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingStep, setEditingStep] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
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
      // Simulated plan generation - in real app, this would call OpenAI
      const generatedPlan = {
        id: crypto.randomUUID(),
        project_id: selectedProject,
        etapes: [
          {
            id: crypto.randomUUID(),
            titre: "Analyse et définition",
            description: "Analyser les besoins et définir les spécifications du projet",
            prompt: `Créer une analyse détaillée pour : ${projectIdea}. Inclure les fonctionnalités principales, le public cible et les contraintes techniques.`,
            status: 'pending' as const,
            sousEtapes: [
              {
                id: crypto.randomUUID(),
                titre: "Analyse des besoins",
                description: "Identifier et documenter tous les besoins fonctionnels",
                prompt: "Lister et prioriser les besoins fonctionnels de l'application",
                status: 'pending' as const
              },
              {
                id: crypto.randomUUID(),
                titre: "Définition du MVP",
                description: "Définir les fonctionnalités minimales viables",
                prompt: "Définir le MVP avec les fonctionnalités essentielles",
                status: 'pending' as const
              }
            ]
          },
          {
            id: crypto.randomUUID(),
            titre: "Design et prototypage",
            description: "Créer les maquettes et prototypes de l'interface",
            prompt: "Concevoir les wireframes et maquettes pour l'interface utilisateur",
            status: 'pending' as const,
            sousEtapes: [
              {
                id: crypto.randomUUID(),
                titre: "Wireframes",
                description: "Créer les wireframes de base",
                prompt: "Générer des wireframes pour toutes les pages principales",
                status: 'pending' as const
              }
            ]
          },
          {
            id: crypto.randomUUID(),
            titre: "Développement",
            description: "Implémenter les fonctionnalités définies",
            prompt: "Développer l'application selon les spécifications et maquettes",
            status: 'pending' as const,
            sousEtapes: [
              {
                id: crypto.randomUUID(),
                titre: "Configuration projet",
                description: "Initialiser le projet avec les technologies choisies",
                prompt: "Configurer un nouveau projet avec les meilleures pratiques",
                status: 'pending' as const
              },
              {
                id: crypto.randomUUID(),
                titre: "Fonctionnalités core",
                description: "Développer les fonctionnalités principales",
                prompt: "Implémenter les fonctionnalités de base définies dans le MVP",
                status: 'pending' as const
              }
            ]
          },
          {
            id: crypto.randomUUID(),
            titre: "Tests et déploiement",
            description: "Tester l'application et la déployer en production",
            prompt: "Mettre en place les tests et procéder au déploiement",
            status: 'pending' as const
          }
        ],
        created_at: new Date().toISOString()
      };

      // Save to database
      const { error } = await supabase
        .from('plans')
        .insert({
          project_id: selectedProject,
          etapes: generatedPlan.etapes
        });

      if (error) throw error;

      setCurrentPlan(generatedPlan);
      
      toast({
        title: "Plan généré",
        description: "Le plan de projet a été créé avec succès",
      });

      await fetchPlans();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de générer le plan",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const updateStepStatus = async (stepId: string, newStatus: 'pending' | 'in_progress' | 'completed', subStepId?: string) => {
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'in_progress': return 'bg-blue-500';
      default: return 'bg-gray-300';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Terminé';
      case 'in_progress': return 'En cours';
      default: return 'À faire';
    }
  };

  useEffect(() => {
    fetchPlans();
  }, [user]);

  return (
    <div className="w-[800px] h-[600px] bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card flex-shrink-0 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-foreground">Plan Generator</h1>
            <p className="text-xs text-muted-foreground">
              Générez des roadmaps structurées pour vos projets
            </p>
          </div>
        </div>
      </header>

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
                      ))}</SelectContent>
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
          <div className="space-y-4">
            {/* Plan Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold">Plan du projet</h2>
                <p className="text-xs text-muted-foreground">
                  {projects.find(p => p.id === currentPlan.project_id)?.name}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setCurrentPlan(null)}>
                Retour
              </Button>
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
        )}
      </div>
    </div>
  );
};

export default PlanGenerator;
