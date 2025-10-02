import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, Component, Image, Type, Palette, Droplet } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useProjectContext } from '@/hooks/useProjectContext';
import { useToast } from '@/hooks/use-toast';

interface ComponentItem {
  id: string;
  nom: string;
  prompt: string | null;
}

interface MediaFile {
  id: string;
  nom: string;
  url: string;
}

interface ColorItem {
  nom: string;
  code: string;
}

interface PaletteItem {
  nom: string;
  couleurs: string[];
}

interface FontItem {
  nom: string;
}

interface PromptResourceInserterProps {
  onInsert: (text: string) => void;
}

const PromptResourceInserter: React.FC<PromptResourceInserterProps> = ({ onInsert }) => {
  const [components, setComponents] = useState<ComponentItem[]>([]);
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [colors, setColors] = useState<ColorItem[]>([]);
  const [palettes, setPalettes] = useState<PaletteItem[]>([]);
  const [fonts, setFonts] = useState<FontItem[]>([]);
  
  const { user } = useAuth();
  const { selectedProject } = useProjectContext();
  const { toast } = useToast();

  // Couleurs par défaut
  const defaultColors: ColorItem[] = [
    { nom: 'Primary Blue', code: '#3B82F6' },
    { nom: 'Purple', code: '#7C3AED' },
    { nom: 'Crimson', code: '#8B1538' },
    { nom: 'Emerald', code: '#10B981' },
    { nom: 'Orange', code: '#F97316' },
  ];

  // Palettes par défaut
  const defaultPalettes: PaletteItem[] = [
    { nom: 'Modern Blue', couleurs: ['#3B82F6', '#7C3AED', '#8B1538'] },
    { nom: 'Nature', couleurs: ['#10B981', '#059669', '#047857'] },
    { nom: 'Sunset', couleurs: ['#F97316', '#FB923C', '#FDBA74'] },
  ];

  // Polices par défaut
  const defaultFonts: FontItem[] = [
    { nom: 'Inter' },
    { nom: 'Roboto' },
    { nom: 'Poppins' },
    { nom: 'Playfair Display' },
    { nom: 'Montserrat' },
  ];

  useEffect(() => {
    fetchData();
  }, [user, selectedProject]);

  const fetchData = async () => {
    if (!user) return;

    try {
      // Fetch components
      const { data: componentsData } = await supabase
        .from('components')
        .select('id, nom, prompt')
        .eq('user_id', user.id);
      
      if (componentsData) setComponents(componentsData);

      // Fetch media files
      const { data: filesData } = await supabase
        .from('files')
        .select('id, nom, url')
        .eq('user_id', user.id);
      
      if (filesData) setMediaFiles(filesData);

      // Load default colors and fonts
      setColors(defaultColors);
      setFonts(defaultFonts);
      setPalettes(defaultPalettes);

      // Fetch project visual identity if available
      if (selectedProject) {
        const { data: visualIdentity } = await supabase
          .from('visual_identities')
          .select('couleurs, polices')
          .eq('project_id', selectedProject.id)
          .single();

        if (visualIdentity) {
          // Merge project colors with defaults
          if (visualIdentity.couleurs && Array.isArray(visualIdentity.couleurs)) {
            const projectColors = visualIdentity.couleurs.map((c: any) => ({
              nom: c.nom || c.name || 'Custom',
              code: c.code || c.hex || c.value
            }));
            setColors([...defaultColors, ...projectColors]);
          }

          // Merge project fonts with defaults
          if (visualIdentity.polices && Array.isArray(visualIdentity.polices)) {
            const projectFonts = visualIdentity.polices.map((f: any) => ({
              nom: f.nom || f.name || f
            }));
            setFonts([...defaultFonts, ...projectFonts]);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleInsertComponent = (component: ComponentItem) => {
    if (component.prompt) {
      onInsert(`<composant>${component.prompt}</composant>`);
      toast({
        title: "Composant ajouté",
        description: `Le prompt du composant "${component.nom}" a été ajouté`,
      });
    }
  };

  const handleInsertMedia = (media: MediaFile) => {
    onInsert(media.url);
    toast({
      title: "Média ajouté",
      description: `Le lien du média "${media.nom}" a été ajouté`,
    });
  };

  const handleInsertColor = (color: ColorItem) => {
    onInsert(color.code);
    toast({
      title: "Couleur ajoutée",
      description: `La couleur ${color.nom} (${color.code}) a été ajoutée`,
    });
  };

  const handleInsertPalette = (palette: PaletteItem) => {
    const colorCodes = palette.couleurs.join(', ');
    onInsert(colorCodes);
    toast({
      title: "Palette ajoutée",
      description: `La palette "${palette.nom}" a été ajoutée`,
    });
  };

  const handleInsertFont = (font: FontItem) => {
    onInsert(font.nom);
    toast({
      title: "Police ajoutée",
      description: `La police "${font.nom}" a été ajoutée`,
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 rounded-full hover:bg-accent"
        >
          <Plus className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {/* Composants */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Component className="mr-2 h-4 w-4" />
            <span>Composants</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="max-h-[300px] overflow-y-auto">
            {components.length === 0 ? (
              <DropdownMenuItem disabled>Aucun composant</DropdownMenuItem>
            ) : (
              components.map((component) => (
                <DropdownMenuItem
                  key={component.id}
                  onClick={() => handleInsertComponent(component)}
                >
                  {component.nom}
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        {/* Médias */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Image className="mr-2 h-4 w-4" />
            <span>Médias</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="max-h-[300px] overflow-y-auto">
            {mediaFiles.length === 0 ? (
              <DropdownMenuItem disabled>Aucun média</DropdownMenuItem>
            ) : (
              mediaFiles.map((media) => (
                <DropdownMenuItem
                  key={media.id}
                  onClick={() => handleInsertMedia(media)}
                >
                  {media.nom}
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        {/* Polices */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Type className="mr-2 h-4 w-4" />
            <span>Polices</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="max-h-[300px] overflow-y-auto">
            {fonts.map((font, index) => (
              <DropdownMenuItem
                key={index}
                onClick={() => handleInsertFont(font)}
                style={{ fontFamily: font.nom }}
              >
                {font.nom}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        {/* Couleurs */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Droplet className="mr-2 h-4 w-4" />
            <span>Couleurs</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="max-h-[300px] overflow-y-auto">
            {colors.map((color, index) => (
              <DropdownMenuItem
                key={index}
                onClick={() => handleInsertColor(color)}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded border"
                    style={{ backgroundColor: color.code }}
                  />
                  <span>{color.nom}</span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {color.code}
                  </span>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        {/* Palettes */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Palette className="mr-2 h-4 w-4" />
            <span>Palettes</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="max-h-[300px] overflow-y-auto">
            {palettes.map((palette, index) => (
              <DropdownMenuItem
                key={index}
                onClick={() => handleInsertPalette(palette)}
              >
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    {palette.couleurs.slice(0, 3).map((color, i) => (
                      <div
                        key={i}
                        className="w-3 h-3 rounded"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <span>{palette.nom}</span>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default PromptResourceInserter;
