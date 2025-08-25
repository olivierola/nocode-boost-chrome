import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Palette, Type, Download, Loader2, Copy, Check, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useProjects } from '@/hooks/useProjects';

interface VisualIdentityData {
  id: string;
  project_id: string;
  couleurs: Array<{
    name: string;
    hex: string;
    usage: string;
  }>;
  polices: Array<{
    name: string;
    family: string;
    weight: string;
    usage: string;
  }>;
  styles: {
    borderRadius: string;
    shadows: string[];
    spacing: string;
  };
  created_at: string;
}

const VisualIdentity = () => {
  const [identities, setIdentities] = useState<VisualIdentityData[]>([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [currentIdentity, setCurrentIdentity] = useState<VisualIdentityData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copiedColor, setCopiedColor] = useState<string | null>(null);
  
  const { user } = useAuth();
  const { projects } = useProjects();
  const { toast } = useToast();

  const fetchIdentities = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('visual_identities')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setIdentities((data as unknown as VisualIdentityData[]) || []);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les identités visuelles",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateIdentity = async () => {
    if (!selectedProject || !projectDescription.trim()) {
      toast({
        title: "Information manquante",
        description: "Veuillez sélectionner un projet et fournir une description",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      // Simulated identity generation - in real app, this would call an AI service
      const generatedIdentity = {
        project_id: selectedProject,
        couleurs: [
          { name: "Primary", hex: "#3B82F6", usage: "Boutons principaux, liens" },
          { name: "Secondary", hex: "#64748B", usage: "Texte secondaire, bordures" },
          { name: "Accent", hex: "#F59E0B", usage: "Éléments d'accentuation" },
          { name: "Success", hex: "#10B981", usage: "Messages de succès" },
          { name: "Warning", hex: "#F59E0B", usage: "Alertes et avertissements" },
          { name: "Error", hex: "#EF4444", usage: "Messages d'erreur" }
        ],
        polices: [
          { name: "Heading", family: "Inter", weight: "600", usage: "Titres et sous-titres" },
          { name: "Body", family: "Inter", weight: "400", usage: "Texte principal" },
          { name: "Caption", family: "Inter", weight: "300", usage: "Légendes et notes" }
        ],
        styles: {
          borderRadius: "8px",
          shadows: ["0 1px 3px rgba(0,0,0,0.1)", "0 4px 6px rgba(0,0,0,0.1)", "0 10px 15px rgba(0,0,0,0.1)"],
          spacing: "4px base unit"
        }
      };

      // Save to database
      const { data, error } = await supabase
        .from('visual_identities')
        .insert(generatedIdentity)
        .select()
        .single();

      if (error) throw error;

      const newIdentity: VisualIdentityData = {
        ...data,
        ...generatedIdentity
      };

      setCurrentIdentity(newIdentity);
      
      toast({
        title: "Identité visuelle générée",
        description: "La charte graphique a été créée avec succès",
      });

      await fetchIdentities();
      setProjectDescription('');
      setSelectedProject('');
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de générer l'identité visuelle",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyColor = async (color: string) => {
    try {
      await navigator.clipboard.writeText(color);
      setCopiedColor(color);
      
      toast({
        title: "Couleur copiée",
        description: `${color} copié dans le presse-papier`,
      });

      setTimeout(() => setCopiedColor(null), 2000);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de copier la couleur",
        variant: "destructive",
      });
    }
  };

  const exportCSS = (identity: VisualIdentityData) => {
    let css = `:root {\n`;
    
    // Colors
    identity.couleurs.forEach(color => {
      css += `  --color-${color.name.toLowerCase()}: ${color.hex};\n`;
    });
    
    // Typography
    identity.polices.forEach(font => {
      css += `  --font-${font.name.toLowerCase()}: "${font.family}", sans-serif;\n`;
      css += `  --font-weight-${font.name.toLowerCase()}: ${font.weight};\n`;
    });
    
    // Styles
    css += `  --border-radius: ${identity.styles.borderRadius};\n`;
    identity.styles.shadows.forEach((shadow, index) => {
      css += `  --shadow-${index + 1}: ${shadow};\n`;
    });
    
    css += "}";

    const blob = new Blob([css], { type: 'text/css' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'visual-identity.css';
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "CSS exporté",
      description: "Le fichier CSS a été téléchargé",
    });
  };

  useEffect(() => {
    fetchIdentities();
  }, [user]);

  if (currentIdentity) {
    const project = projects.find(p => p.id === currentIdentity.project_id);
    
    return (
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="border-b border-border bg-card flex-shrink-0 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-foreground">Identité Visuelle</h2>
              <p className="text-xs text-muted-foreground">
                {project?.name || 'Projet inconnu'}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => exportCSS(currentIdentity)}>
                <Download className="h-3 w-3 mr-1" />
                Exporter CSS
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCurrentIdentity(null)}>
                Retour
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 px-6 py-4 overflow-y-auto">
          <Tabs defaultValue="colors" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="colors">Couleurs</TabsTrigger>
              <TabsTrigger value="fonts">Typographie</TabsTrigger>
              <TabsTrigger value="styles">Styles</TabsTrigger>
            </TabsList>

            <TabsContent value="colors" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {currentIdentity.couleurs.map((color, index) => (
                  <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => copyColor(color.hex)}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-12 h-12 rounded-md border-2 border-border"
                          style={{ backgroundColor: color.hex }}
                        />
                        <div className="flex-1">
                          <h3 className="text-sm font-medium">{color.name}</h3>
                          <p className="text-xs text-muted-foreground">{color.hex}</p>
                          <p className="text-xs text-muted-foreground mt-1">{color.usage}</p>
                        </div>
                        {copiedColor === color.hex ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="fonts" className="space-y-4">
              <div className="space-y-3">
                {currentIdentity.polices.map((font, index) => (
                  <Card key={index}>
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-medium">{font.name}</h3>
                          <Badge variant="outline" className="text-xs">
                            {font.family} {font.weight}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{font.usage}</p>
                        <div 
                          className="text-lg"
                          style={{ 
                            fontFamily: font.family,
                            fontWeight: font.weight
                          }}
                        >
                          The quick brown fox jumps over the lazy dog
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="styles" className="space-y-4">
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Border Radius</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <div 
                        className="w-16 h-16 bg-primary"
                        style={{ borderRadius: currentIdentity.styles.borderRadius }}
                      />
                      <span className="text-sm font-mono">{currentIdentity.styles.borderRadius}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Shadows</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {currentIdentity.styles.shadows.map((shadow, index) => (
                        <div key={index} className="flex items-center gap-4">
                          <div 
                            className="w-16 h-16 bg-card border"
                            style={{ 
                              boxShadow: shadow,
                              borderRadius: currentIdentity.styles.borderRadius 
                            }}
                          />
                          <span className="text-xs font-mono">{shadow}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Spacing</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{currentIdentity.styles.spacing}</p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
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
            <h2 className="text-base font-bold text-foreground">Identité Visuelle</h2>
            <p className="text-xs text-muted-foreground">
              Générez des chartes graphiques pour vos projets
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 py-4 overflow-y-auto">
        <div className="space-y-6">
          {/* Generator Form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Générer une identité visuelle
              </CardTitle>
              <CardDescription className="text-xs">
                Décrivez votre projet pour générer une charte graphique personnalisée
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
                <Label htmlFor="project-description">Description du projet</Label>
                <Textarea
                  id="project-description"
                  placeholder="Décrivez l'ambiance, le style et l'audience cible de votre projet..."
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>

              <Button 
                onClick={generateIdentity}
                disabled={isGenerating || !projectDescription.trim() || !selectedProject}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Génération en cours...
                  </>
                ) : (
                  'Générer l\'identité visuelle'
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Existing Identities */}
          {identities.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold">Identités existantes</h2>
              <div className="grid gap-3">
                {identities.map((identity) => {
                  const project = projects.find(p => p.id === identity.project_id);
                  
                  return (
                    <Card 
                      key={identity.id} 
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => setCurrentIdentity(identity)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h3 className="text-sm font-medium">{project?.name || 'Projet inconnu'}</h3>
                            <div className="flex items-center gap-1 mt-2">
                              {identity.couleurs.slice(0, 4).map((color, index) => (
                                <div
                                  key={index}
                                  className="w-4 h-4 rounded-full border border-border"
                                  style={{ backgroundColor: color.hex }}
                                />
                              ))}
                              {identity.couleurs.length > 4 && (
                                <span className="text-xs text-muted-foreground ml-1">
                                  +{identity.couleurs.length - 4}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              <Palette className="h-3 w-3 mr-1" />
                              {identity.couleurs.length} couleurs
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              <Type className="h-3 w-3 mr-1" />
                              {identity.polices.length} polices
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VisualIdentity;
