import { useState, useEffect } from 'react';
import { useProjects } from '@/hooks/useProjects';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface VisualIdentity {
  couleurs: {
    primaire: { hex: string; nom: string; usage: string };
    secondaire: { hex: string; nom: string; usage: string };
    accent: { hex: string; nom: string; usage: string };
    neutres: Array<{ hex: string; nom: string; usage: string }>;
  };
  polices: {
    titre: { nom: string; fallback: string; poids: number[] };
    corps: { nom: string; fallback: string; poids: number[] };
    accent: { nom: string; fallback: string; poids: number[] };
  };
  styles: {
    boutons: { radius: string; shadow: string };
    cartes: { radius: string; shadow: string };
    inputs: { radius: string; border: string };
  };
}

export const useVisualIdentity = (projectId?: string) => {
  const [identity, setIdentity] = useState<VisualIdentity | null>(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const generateIdentity = async (description: string, style?: string, industry?: string) => {
    if (!projectId || !user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-visual-identity', {
        body: {
          projectDescription: description,
          style: style || 'moderne et professionnel',
          industry: industry || 'général'
        }
      });

      if (error) throw error;

      if (data?.success && data?.identity) {
        setIdentity(data.identity);
        
        // Save to database
        const { error: saveError } = await supabase
          .from('visual_identities')
          .upsert({
            project_id: projectId,
            couleurs: data.identity.couleurs,
            polices: data.identity.polices,
            styles: data.identity.styles
          });

        if (saveError) {
          console.error('Error saving visual identity:', saveError);
        }

        // Log activity
        if ((window as any).logActivity) {
          (window as any).logActivity('visual_identity_generated', {
            projectId,
            colorsCount: Object.keys(data.identity.couleurs).length
          });
        }

        toast({
          title: "Identité visuelle générée",
          description: "Votre charte graphique a été créée avec succès",
        });

        return data.identity;
      }
    } catch (error: any) {
      console.error('Error generating visual identity:', error);
      toast({
        title: "Erreur",
        description: "Impossible de générer l'identité visuelle",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadIdentity = async () => {
    if (!projectId || !user) return;

    try {
      const { data, error } = await supabase
        .from('visual_identities')
        .select('*')
        .eq('project_id', projectId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setIdentity({
          couleurs: data.couleurs as any,
          polices: data.polices as any,
          styles: data.styles as any
        });
      }
    } catch (error) {
      console.error('Error loading visual identity:', error);
    }
  };

  const exportToCSS = () => {
    if (!identity) return '';

    const css = `
/* Generated Visual Identity CSS */

:root {
  /* Colors */
  --color-primary: ${identity.couleurs.primaire.hex};
  --color-secondary: ${identity.couleurs.secondaire.hex};
  --color-accent: ${identity.couleurs.accent.hex};
  ${identity.couleurs.neutres.map((color, index) => 
    `--color-neutral-${index + 1}: ${color.hex};`
  ).join('\n  ')}

  /* Typography */
  --font-title: "${identity.polices.titre.nom}", ${identity.polices.titre.fallback};
  --font-body: "${identity.polices.corps.nom}", ${identity.polices.corps.fallback};
  --font-accent: "${identity.polices.accent.nom}", ${identity.polices.accent.fallback};

  /* Styles */
  --button-radius: ${identity.styles.boutons.radius};
  --button-shadow: ${identity.styles.boutons.shadow};
  --card-radius: ${identity.styles.cartes.radius};
  --card-shadow: ${identity.styles.cartes.shadow};
  --input-radius: ${identity.styles.inputs.radius};
  --input-border: ${identity.styles.inputs.border};
}

/* Button Styles */
.btn-primary {
  background-color: var(--color-primary);
  color: white;
  border-radius: var(--button-radius);
  box-shadow: var(--button-shadow);
  font-family: var(--font-body);
}

.btn-secondary {
  background-color: var(--color-secondary);
  color: white;
  border-radius: var(--button-radius);
  box-shadow: var(--button-shadow);
  font-family: var(--font-body);
}

/* Card Styles */
.card {
  border-radius: var(--card-radius);
  box-shadow: var(--card-shadow);
  background-color: white;
}

/* Input Styles */
.input {
  border-radius: var(--input-radius);
  border: var(--input-border);
  font-family: var(--font-body);
}

/* Typography */
h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-title);
}

body {
  font-family: var(--font-body);
}

.accent-text {
  font-family: var(--font-accent);
}
`;

    return css;
  };

  useEffect(() => {
    if (projectId) {
      loadIdentity();
    }
  }, [projectId, user]);

  return {
    identity,
    loading,
    generateIdentity,
    loadIdentity,
    exportToCSS
  };
};