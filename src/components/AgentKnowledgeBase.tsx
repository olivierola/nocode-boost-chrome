import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Palette, Type, Component, Search } from 'lucide-react';

interface UIComponent {
  id: string;
  name: string;
  description: string;
  prompt: string;
  category: string;
  tags: string[];
}

interface ColorPalette {
  id: string;
  name: string;
  description: string;
  colors: string[];
  use_case: string;
  tags: string[];
}

interface FontInfo {
  id: string;
  name: string;
  description: string;
  category: 'serif' | 'sans-serif' | 'monospace' | 'display' | 'handwriting';
  google_font_url?: string;
  use_cases: string[];
  tags: string[];
}

interface AgentKnowledgeBaseProps {
  onResourceSelect?: (resource: any, type: 'component' | 'color' | 'font') => void;
}

const AgentKnowledgeBase: React.FC<AgentKnowledgeBaseProps> = ({ onResourceSelect }) => {
  const { user } = useAuth();
  
  const [components, setComponents] = useState<UIComponent[]>([]);
  const [palettes, setPalettes] = useState<ColorPalette[]>([]);
  const [fonts, setFonts] = useState<FontInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingItem, setEditingItem] = useState<{type: string, item: any} | null>(null);

  useEffect(() => {
    loadKnowledgeBase();
  }, []);

  const loadKnowledgeBase = async () => {
    setLoading(true);
    try {
      // Charger les composants UI personnalisés de l'utilisateur
      const { data: userComponents } = await supabase
        .from('components')
        .select('*')
        .eq('user_id', user?.id);

      if (userComponents) {
        const transformedComponents = userComponents.map(comp => ({
          id: comp.id,
          name: comp.nom,
          description: comp.description || '',
          prompt: comp.prompt || '',
          category: 'custom',
          tags: []
        }));
        setComponents(transformedComponents);
      }

      // Initialiser avec des palettes de couleurs par défaut
      const defaultPalettes: ColorPalette[] = [
        {
          id: 'modern-blue',
          name: 'Bleu Moderne',
          description: 'Palette professionnelle avec des tons bleus modernes',
          colors: ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#dbeafe'],
          use_case: 'Applications professionnelles, dashboards',
          tags: ['professionnel', 'moderne', 'bleu']
        },
        {
          id: 'warm-sunset',
          name: 'Coucher de Soleil',
          description: 'Tons chauds orange et rouge pour un design chaleureux',
          colors: ['#ea580c', '#f97316', '#fb923c', '#fdba74', '#fed7aa'],
          use_case: 'Sites créatifs, portfolios, landing pages',
          tags: ['chaleureux', 'créatif', 'orange']
        },
        {
          id: 'nature-green',
          name: 'Vert Nature',
          description: 'Palette inspirée de la nature avec des verts apaisants',
          colors: ['#16a34a', '#22c55e', '#4ade80', '#86efac', '#dcfce7'],
          use_case: 'Eco-responsable, santé, bien-être',
          tags: ['nature', 'eco', 'vert']
        },
        {
          id: 'elegant-purple',
          name: 'Violet Élégant',
          description: 'Tons violets sophistiqués pour un design premium',
          colors: ['#7c3aed', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ede9fe'],
          use_case: 'Luxury, premium, créatif',
          tags: ['luxe', 'premium', 'violet']
        }
      ];

      const defaultFonts: FontInfo[] = [
        {
          id: 'inter',
          name: 'Inter',
          description: 'Police moderne sans-serif très lisible, parfaite pour les interfaces',
          category: 'sans-serif',
          google_font_url: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
          use_cases: ['interfaces', 'texte de corps', 'navigation'],
          tags: ['moderne', 'lisible', 'interface']
        },
        {
          id: 'playfair-display',
          name: 'Playfair Display',
          description: 'Police serif élégante avec des empattements distinctifs, idéale pour les titres',
          category: 'serif',
          google_font_url: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&display=swap',
          use_cases: ['titres', 'headers', 'contenu éditorial'],
          tags: ['élégant', 'serif', 'titres']
        },
        {
          id: 'source-code-pro',
          name: 'Source Code Pro',
          description: 'Police monospace conçue pour le code et les données techniques',
          category: 'monospace',
          google_font_url: 'https://fonts.googleapis.com/css2?family=Source+Code+Pro:wght@400;500;600&display=swap',
          use_cases: ['code', 'données', 'technique'],
          tags: ['code', 'monospace', 'technique']
        },
        {
          id: 'poppins',
          name: 'Poppins',
          description: 'Police géométrique friendly et moderne, excellente pour les brands',
          category: 'sans-serif',
          google_font_url: 'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap',
          use_cases: ['branding', 'marketing', 'friendly'],
          tags: ['friendly', 'brand', 'moderne']
        }
      ];

      setPalettes(defaultPalettes);
      setFonts(defaultFonts);
    } catch (error) {
      console.error('Erreur chargement base de connaissances:', error);
      toast.error('Erreur lors du chargement de la base de connaissances');
    }
    setLoading(false);
  };

  const filterItems = (items: any[], searchTerm: string) => {
    if (!searchTerm) return items;
    return items.filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.tags && item.tags.some((tag: string) => tag.toLowerCase().includes(searchTerm.toLowerCase())))
    );
  };

  const handleResourceSelect = (resource: any, type: 'component' | 'color' | 'font') => {
    onResourceSelect?.(resource, type);
    toast.success(`${resource.name} sélectionné pour l'optimisation`);
  };

  const ComponentCard = ({ component }: { component: UIComponent }) => (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" 
          onClick={() => handleResourceSelect(component, 'component')}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Component className="w-4 h-4" />
          {component.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-xs text-muted-foreground mb-2">{component.description}</p>
        <Badge variant="outline" className="text-xs">{component.category}</Badge>
        {component.prompt && (
          <div className="mt-2 p-2 bg-secondary/50 rounded text-xs font-mono">
            {component.prompt.substring(0, 60)}...
          </div>
        )}
      </CardContent>
    </Card>
  );

  const PaletteCard = ({ palette }: { palette: ColorPalette }) => (
    <Card className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => handleResourceSelect(palette, 'color')}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Palette className="w-4 h-4" />
          {palette.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-xs text-muted-foreground mb-2">{palette.description}</p>
        <div className="flex gap-1 mb-2">
          {palette.colors.map((color, index) => (
            <div 
              key={index}
              className="w-6 h-6 rounded-full border"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
        <p className="text-xs text-muted-foreground">{palette.use_case}</p>
        <div className="flex gap-1 mt-2">
          {palette.tags.map(tag => (
            <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  const FontCard = ({ font }: { font: FontInfo }) => (
    <Card className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => handleResourceSelect(font, 'font')}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Type className="w-4 h-4" />
          {font.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-xs text-muted-foreground mb-2">{font.description}</p>
        <Badge variant="outline" className="text-xs">{font.category}</Badge>
        <div className="mt-2 text-xs">
          <strong>Usages:</strong> {font.use_cases.join(', ')}
        </div>
        <div className="flex gap-1 mt-2">
          {font.tags.map(tag => (
            <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="w-5 h-5" />
          Base de Connaissances Agent
        </CardTitle>
        <div className="flex gap-2">
          <Input
            placeholder="Rechercher des ressources..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1"
          />
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="components" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="components">Composants UI</TabsTrigger>
            <TabsTrigger value="colors">Palettes Couleurs</TabsTrigger>
            <TabsTrigger value="fonts">Polices</TabsTrigger>
          </TabsList>

          <TabsContent value="components" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-medium">Composants UI ({components.length})</h3>
              <Button size="sm" variant="outline">
                <Plus className="w-4 h-4 mr-1" />
                Ajouter
              </Button>
            </div>
            <ScrollArea className="h-64">
              <div className="grid gap-3">
                {filterItems(components, searchTerm).map(component => (
                  <ComponentCard key={component.id} component={component} />
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="colors" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-medium">Palettes de Couleurs ({palettes.length})</h3>
            </div>
            <ScrollArea className="h-64">
              <div className="grid gap-3">
                {filterItems(palettes, searchTerm).map(palette => (
                  <PaletteCard key={palette.id} palette={palette} />
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="fonts" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-medium">Polices ({fonts.length})</h3>
            </div>
            <ScrollArea className="h-64">
              <div className="grid gap-3">
                {filterItems(fonts, searchTerm).map(font => (
                  <FontCard key={font.id} font={font} />
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default AgentKnowledgeBase;