import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Component, Image, Type, Palette, Droplet } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  ResourceShiftingDropdown,
  ComponentsGrid,
  MediaGrid,
  FontsGrid,
  ColorsGrid,
  PalettesGrid,
} from '@/components/ui/resource-shifting-dropdown';

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
  onInsert?: (text: string) => void;
  onInsertResource?: (text: string) => void;
}

const PromptResourceInserter: React.FC<PromptResourceInserterProps> = ({ onInsert, onInsertResource }) => {
  const insertCallback = onInsertResource || onInsert;
  const [components, setComponents] = useState<ComponentItem[]>([]);
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [colors, setColors] = useState<ColorItem[]>([]);
  const [palettes, setPalettes] = useState<PaletteItem[]>([]);
  const [fonts, setFonts] = useState<FontItem[]>([]);
  
  const { user } = useAuth();

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
  }, [user]);

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

      // Load default colors, fonts, and palettes
      setColors(defaultColors);
      setFonts(defaultFonts);
      setPalettes(defaultPalettes);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleInsertComponent = (component: ComponentItem) => {
    if (component.prompt && insertCallback) {
      insertCallback(`<composant>${component.prompt}</composant>`);
      toast.success(`Composant "${component.nom}" ajouté`);
    }
  };

  const handleInsertMedia = (media: MediaFile) => {
    if (insertCallback) {
      insertCallback(media.url);
      toast.success(`Média "${media.nom}" ajouté`);
    }
  };

  const handleInsertColor = (color: ColorItem) => {
    if (insertCallback) {
      insertCallback(color.code);
      toast.success(`Couleur ${color.nom} ajoutée`);
    }
  };

  const handleInsertPalette = (palette: PaletteItem) => {
    if (insertCallback) {
      const colorCodes = palette.couleurs.join(', ');
      insertCallback(colorCodes);
      toast.success(`Palette "${palette.nom}" ajoutée`);
    }
  };

  const handleInsertFont = (font: FontItem) => {
    if (insertCallback) {
      insertCallback(font.nom);
      toast.success(`Police "${font.nom}" ajoutée`);
    }
  };

  const tabs = [
    {
      id: 1,
      title: 'Composants',
      icon: Component,
      Component: (props: any) => (
        <ComponentsGrid items={components} onSelect={handleInsertComponent} />
      ),
    },
    {
      id: 2,
      title: 'Médias',
      icon: Image,
      Component: (props: any) => (
        <MediaGrid items={mediaFiles} onSelect={handleInsertMedia} />
      ),
    },
    {
      id: 3,
      title: 'Polices',
      icon: Type,
      Component: (props: any) => (
        <FontsGrid items={fonts} onSelect={handleInsertFont} />
      ),
    },
    {
      id: 4,
      title: 'Couleurs',
      icon: Droplet,
      Component: (props: any) => (
        <ColorsGrid items={colors} onSelect={handleInsertColor} />
      ),
    },
    {
      id: 5,
      title: 'Palettes',
      icon: Palette,
      Component: (props: any) => (
        <PalettesGrid items={palettes} onSelect={handleInsertPalette} />
      ),
    },
  ];

  return (
    <div className="relative">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 rounded-full hover:bg-accent"
      >
        <Plus className="h-5 w-5" />
      </Button>
      <ResourceShiftingDropdown tabs={tabs} className="absolute left-0 top-full mt-2" />
    </div>
  );
};

export default PromptResourceInserter;
