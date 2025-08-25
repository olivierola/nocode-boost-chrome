import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Project } from '@/hooks/useProjects';

interface ProjectContextType {
  selectedProject: Project | null;
  selectProject: (project: Project) => void;
  clearProject: () => void;
  isProjectSelected: boolean;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const useProjectContext = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProjectContext must be used within a ProjectProvider');
  }
  return context;
};

interface ProjectProviderProps {
  children: ReactNode;
}

export const ProjectProvider = ({ children }: ProjectProviderProps) => {
  const { user } = useAuth();
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const selectProject = (project: Project) => {
    setSelectedProject(project);
    // Sauvegarder dans localStorage pour persistence
    localStorage.setItem('selectedProjectId', project.id);
  };

  const clearProject = () => {
    setSelectedProject(null);
    localStorage.removeItem('selectedProjectId');
  };

  // Nettoyer le projet sélectionné si l'utilisateur se déconnecte
  useEffect(() => {
    if (!user) {
      setSelectedProject(null);
      localStorage.removeItem('selectedProjectId');
    }
  }, [user]);

  const isProjectSelected = selectedProject !== null;

  return (
    <ProjectContext.Provider value={{
      selectedProject,
      selectProject,
      clearProject,
      isProjectSelected,
    }}>
      {children}
    </ProjectContext.Provider>
  );
};