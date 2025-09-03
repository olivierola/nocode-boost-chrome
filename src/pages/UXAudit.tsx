import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, CheckCircle, AlertCircle, Info, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useProjects } from '@/hooks/useProjects';

interface UXAudit {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  etapes: Array<{
    id: string;
    type: 'ux' | 'seo' | 'performance' | 'accessibility';
    titre: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    prompt: string;
    status: 'pending' | 'in_progress' | 'completed';
    recommendations?: string;
  }>;
  created_at: string;
}

const UXAudit = () => {
  const [audits, setAudits] = useState<UXAudit[]>([]);
  const [currentAudit, setCurrentAudit] = useState<UXAudit | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form states
  const [selectedProject, setSelectedProject] = useState('');
  const [auditTitle, setAuditTitle] = useState('');
  const [auditDescription, setAuditDescription] = useState('');
  const [auditType, setAuditType] = useState<'ux' | 'seo' | 'complete'>('complete');

  const { user } = useAuth();
  const { projects } = useProjects();
  const { toast } = useToast();

  const fetchAudits = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('ux_audits')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAudits((data as unknown as UXAudit[]) || []);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les audits",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateAudit = async () => {
    if (!selectedProject || !auditTitle.trim()) {
      toast({
        title: "Information manquante",
        description: "Veuillez remplir tous les champs requis",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      // Generate detailed prompt for AI
      const prompt = `Générer un audit ${auditType} détaillé pour le projet "${auditTitle}". 
      Description: ${auditDescription}
      Type d'audit: ${auditType}
      
      Créer des étapes d'audit spécifiques avec des prompts détaillés pour chaque aspect à analyser.`;

      const { data, error } = await supabase.functions.invoke('generate-audit', {
        body: {
          prompt,
          projectId: selectedProject,
          title: auditTitle
        }
      });

      if (error) throw error;

      if (data && data.etapes) {
        const newAudit: UXAudit = {
          id: data.id,
          project_id: selectedProject,
          title: auditTitle,
          description: auditDescription || null,
          etapes: data.etapes,
          created_at: new Date().toISOString()
        };

        setCurrentAudit(newAudit);
        setIsCreating(false);
        
        toast({
          title: "Audit généré",
          description: "L'audit a été créé avec succès avec l'IA",
        });

        await fetchAudits();
      }
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de créer l'audit",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high': return 'Haute';
      case 'medium': return 'Moyenne';
      case 'low': return 'Faible';
      default: return 'Non définie';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'ux': return '🎨';
      case 'seo': return '🔍';
      case 'performance': return '⚡';
      case 'accessibility': return '♿';
      default: return '📋';
    }
  };

  const filteredAudits = audits.filter(audit =>
    audit.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    audit.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    fetchAudits();
  }, [user]);

  if (currentAudit) {
    return (
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="border-b border-border bg-card flex-shrink-0 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-foreground">{currentAudit.title}</h2>
              <p className="text-xs text-muted-foreground">
                {projects.find(p => p.id === currentAudit.project_id)?.name}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setCurrentAudit(null)}>
              Retour
            </Button>
          </div>
        </div>

        {/* Audit Steps */}
        <div className="flex-1 px-6 py-4 overflow-y-auto">
          <div className="space-y-4">
            {currentAudit.etapes.map((step, index) => (
              <Card key={step.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="text-lg">{getTypeIcon(step.type)}</div>
                      <div className="flex-1">
                        <CardTitle className="text-sm">{step.titre}</CardTitle>
                        <CardDescription className="text-xs mt-1">
                          {step.description}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="text-xs">
                        <div className={`w-2 h-2 rounded-full mr-1 ${getPriorityColor(step.priority)}`} />
                        {getPriorityLabel(step.priority)}
                      </Badge>
                      <Badge variant={step.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                        {step.status === 'completed' ? 'Terminé' : 'À faire'}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="bg-muted p-3 rounded-md">
                    <p className="text-xs font-medium mb-1">Prompt d'audit:</p>
                    <p className="text-xs text-muted-foreground">{step.prompt}</p>
                  </div>
                  {step.recommendations && (
                    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
                      <p className="text-xs font-medium text-green-800 mb-1">Recommandations:</p>
                      <p className="text-xs text-green-700">{step.recommendations}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-card flex-shrink-0 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-foreground">UX & SEO Audit</h2>
            <p className="text-xs text-muted-foreground">
              Analysez et optimisez vos projets
            </p>
          </div>
          <Button size="sm" onClick={() => setIsCreating(true)}>
            <Plus className="h-3 w-3 mr-1" />
            Nouvel Audit
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 py-4 overflow-y-auto">
        {isCreating ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Créer un nouvel audit</CardTitle>
              <CardDescription className="text-xs">
                Générez un audit personnalisé pour votre projet
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="project-select">Projet *</Label>
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
                <Label htmlFor="audit-title">Titre de l'audit *</Label>
                <Input
                  id="audit-title"
                  placeholder="Ex: Audit UX complet"
                  value={auditTitle}
                  onChange={(e) => setAuditTitle(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="audit-description">Description</Label>
                <Textarea
                  id="audit-description"
                  placeholder="Décrivez l'objectif de cet audit..."
                  value={auditDescription}
                  onChange={(e) => setAuditDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="audit-type">Type d'audit</Label>
                <Select value={auditType} onValueChange={(value: 'ux' | 'seo' | 'complete') => setAuditType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="complete">Audit complet (UX + SEO)</SelectItem>
                    <SelectItem value="ux">UX uniquement</SelectItem>
                    <SelectItem value="seo">SEO uniquement</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsCreating(false)}
                  disabled={isGenerating}
                  className="flex-1"
                >
                  Annuler
                </Button>
                <Button
                  onClick={generateAudit}
                  disabled={isGenerating || !selectedProject || !auditTitle.trim()}
                  className="flex-1"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Génération...
                    </>
                  ) : (
                    'Générer l\'audit'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <Input
                placeholder="Rechercher un audit..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 text-xs"
              />
            </div>

            {/* Audits List */}
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredAudits.length === 0 ? (
              <Card className="border-dashed border-2">
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <Search className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground text-center">
                    {searchTerm ? 'Aucun audit trouvé' : 'Aucun audit créé'}
                  </p>
                  <p className="text-xs text-muted-foreground text-center mt-1">
                    Créez votre premier audit pour analyser un projet
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredAudits.map((audit) => {
                  const project = projects.find(p => p.id === audit.project_id);
                  const completedSteps = audit.etapes.filter(e => e.status === 'completed').length;
                  const totalSteps = audit.etapes.length;
                  const progress = Math.round((completedSteps / totalSteps) * 100);

                  return (
                    <Card 
                      key={audit.id} 
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => setCurrentAudit(audit)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="text-sm font-medium">{audit.title}</h3>
                            <p className="text-xs text-muted-foreground mt-1">
                              {project?.name || 'Projet inconnu'}
                            </p>
                            {audit.description && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {audit.description}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              <div className="flex gap-1">
                                {Array.from(new Set(audit.etapes.map(e => e.type))).map(type => (
                                  <span key={type} className="text-xs">
                                    {getTypeIcon(type)}
                                  </span>
                                ))}
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {completedSteps}/{totalSteps} terminées
                              </span>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {progress}%
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default UXAudit;