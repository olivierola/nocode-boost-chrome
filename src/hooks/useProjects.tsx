import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface Project {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  url: string | null;
  password?: string | null;
  created_at: string;
  updated_at: string;
  collaborators?: Array<{
    role: 'owner' | 'collaborator' | 'viewer';
    user_id: string;
  }>;
}

export const useProjects = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchProjects = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          collaborators (
            role,
            user_id
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects((data as Project[]) || []);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les projets",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createProject = async (name: string, description?: string, password?: string, url?: string) => {
    if (!user) return null;

    console.log('Creating project with:', { name, description, url, password, owner_id: user.id });

    try {
      const { data, error } = await supabase
        .from('projects')
        .insert({
          name,
          description: description || null,
          url: url || null,
          password: password || null,
          owner_id: user.id,
        })
        .select()
        .single();

      console.log('Insert result:', { data, error });

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      toast({
        title: "Projet créé",
        description: `Le projet "${name}" a été créé avec succès`,
      });

      await fetchProjects();
      return data;
    } catch (error: any) {
      console.error('Full error:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer le projet",
        variant: "destructive",
      });
      return null;
    }
  };

  const updateProject = async (id: string, updates: { name?: string; description?: string; url?: string }) => {
    try {
      const { error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Projet modifié",
        description: "Les modifications ont été sauvegardées",
      });

      await fetchProjects();
      return true;
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de modifier le projet",
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteProject = async (id: string) => {
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Projet supprimé",
        description: "Le projet a été supprimé définitivement",
      });

      await fetchProjects();
      return true;
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le projet",
        variant: "destructive",
      });
      return false;
    }
  };

  const getUserRole = (project: Project) => {
    if (!user) return null;
    if (project.owner_id === user.id) return 'owner';
    
    const member = project.collaborators?.find(m => m.user_id === user.id);
    return member?.role || null;
  };

  useEffect(() => {
    fetchProjects();
  }, [user]);

  return {
    projects,
    loading,
    createProject,
    updateProject,
    deleteProject,
    getUserRole,
    refetch: fetchProjects,
  };
};