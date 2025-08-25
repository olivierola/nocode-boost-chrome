-- Drop existing project_members table and recreate as collaborators
DROP TABLE IF EXISTS public.project_members CASCADE;

-- Add password field to projects table
ALTER TABLE public.projects ADD COLUMN password TEXT;

-- Create components table
CREATE TABLE public.components (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nom TEXT NOT NULL,
  description TEXT,
  prompt TEXT,
  fichier_id UUID,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create files table
CREATE TABLE public.files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nom TEXT NOT NULL,
  type TEXT NOT NULL,
  url TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create plans table
CREATE TABLE public.plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  etapes JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create ux_audits table
CREATE TABLE public.ux_audits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  etapes JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create visual_identities table
CREATE TABLE public.visual_identities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  couleurs JSONB DEFAULT '[]'::jsonb,
  polices JSONB DEFAULT '[]'::jsonb,
  styles JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create collaborators table (replaces project_members)
CREATE TABLE public.collaborators (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'collaborator', 'viewer')) DEFAULT 'collaborator',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, user_id)
);

-- Create activity_logs table
CREATE TABLE public.activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add foreign key constraint for components.fichier_id
ALTER TABLE public.components 
ADD CONSTRAINT fk_components_fichier 
FOREIGN KEY (fichier_id) REFERENCES public.files(id) ON DELETE SET NULL;

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('project-files', 'project-files', false),
  ('components', 'components', false),
  ('assets', 'assets', true);

-- Enable RLS on all new tables
ALTER TABLE public.components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ux_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visual_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for components
CREATE POLICY "Users can view components they own or from accessible projects" 
ON public.components FOR SELECT 
USING (
  user_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public.collaborators c 
    JOIN public.projects p ON c.project_id = p.id 
    WHERE c.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create their own components" 
ON public.components FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own components" 
ON public.components FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own components" 
ON public.components FOR DELETE 
USING (auth.uid() = user_id);

-- RLS Policies for files
CREATE POLICY "Users can view their own files or files from accessible projects" 
ON public.files FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own files" 
ON public.files FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own files" 
ON public.files FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own files" 
ON public.files FOR DELETE 
USING (auth.uid() = user_id);

-- RLS Policies for plans
CREATE POLICY "Users can view plans from accessible projects" 
ON public.plans FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.projects p 
    LEFT JOIN public.collaborators c ON p.id = c.project_id 
    WHERE p.id = project_id AND (
      p.owner_id = auth.uid() OR 
      c.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Project owners and collaborators can manage plans" 
ON public.plans FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.projects p 
    LEFT JOIN public.collaborators c ON p.id = c.project_id 
    WHERE p.id = project_id AND (
      p.owner_id = auth.uid() OR 
      (c.user_id = auth.uid() AND c.role IN ('owner', 'collaborator'))
    )
  )
);

-- RLS Policies for ux_audits
CREATE POLICY "Users can view UX audits from accessible projects" 
ON public.ux_audits FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.projects p 
    LEFT JOIN public.collaborators c ON p.id = c.project_id 
    WHERE p.id = project_id AND (
      p.owner_id = auth.uid() OR 
      c.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Project owners and collaborators can manage UX audits" 
ON public.ux_audits FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.projects p 
    LEFT JOIN public.collaborators c ON p.id = c.project_id 
    WHERE p.id = project_id AND (
      p.owner_id = auth.uid() OR 
      (c.user_id = auth.uid() AND c.role IN ('owner', 'collaborator'))
    )
  )
);

-- RLS Policies for visual_identities
CREATE POLICY "Users can view visual identities from accessible projects" 
ON public.visual_identities FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.projects p 
    LEFT JOIN public.collaborators c ON p.id = c.project_id 
    WHERE p.id = project_id AND (
      p.owner_id = auth.uid() OR 
      c.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Project owners and collaborators can manage visual identities" 
ON public.visual_identities FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.projects p 
    LEFT JOIN public.collaborators c ON p.id = c.project_id 
    WHERE p.id = project_id AND (
      p.owner_id = auth.uid() OR 
      (c.user_id = auth.uid() AND c.role IN ('owner', 'collaborator'))
    )
  )
);

-- RLS Policies for collaborators
CREATE POLICY "Users can view collaborators from accessible projects" 
ON public.collaborators FOR SELECT 
USING (
  user_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public.projects p 
    WHERE p.id = project_id AND p.owner_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM public.collaborators c2 
    WHERE c2.project_id = project_id AND c2.user_id = auth.uid()
  )
);

CREATE POLICY "Project owners can manage collaborators" 
ON public.collaborators FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.projects p 
    WHERE p.id = project_id AND p.owner_id = auth.uid()
  )
);

-- RLS Policies for activity_logs
CREATE POLICY "Users can view their own activity logs" 
ON public.activity_logs FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own activity logs" 
ON public.activity_logs FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Storage policies for project-files bucket
CREATE POLICY "Users can view files in projects they have access to" 
ON storage.objects FOR SELECT 
USING (
  bucket_id = 'project-files' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can upload files to their own folder" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'project-files' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own files" 
ON storage.objects FOR UPDATE 
USING (
  bucket_id = 'project-files' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own files" 
ON storage.objects FOR DELETE 
USING (
  bucket_id = 'project-files' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Storage policies for components bucket
CREATE POLICY "Users can view their component files" 
ON storage.objects FOR SELECT 
USING (
  bucket_id = 'components' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can upload component files" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'components' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their component files" 
ON storage.objects FOR UPDATE 
USING (
  bucket_id = 'components' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their component files" 
ON storage.objects FOR DELETE 
USING (
  bucket_id = 'components' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Storage policies for assets bucket (public)
CREATE POLICY "Assets are publicly viewable" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'assets');

CREATE POLICY "Authenticated users can upload assets" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'assets' AND 
  auth.role() = 'authenticated'
);

-- Update projects RLS to use collaborators table
DROP POLICY IF EXISTS "Users can view projects they own or collaborate on" ON public.projects;
CREATE POLICY "Users can view projects they own or collaborate on" 
ON public.projects FOR SELECT 
USING (
  owner_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public.collaborators 
    WHERE project_id = projects.id AND user_id = auth.uid()
  )
);

-- Update handle_new_project function to use collaborators table
CREATE OR REPLACE FUNCTION public.handle_new_project()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.collaborators (project_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add update timestamp triggers for all new tables
CREATE TRIGGER update_components_updated_at
  BEFORE UPDATE ON public.components
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_files_updated_at
  BEFORE UPDATE ON public.files
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_plans_updated_at
  BEFORE UPDATE ON public.plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ux_audits_updated_at
  BEFORE UPDATE ON public.ux_audits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_visual_identities_updated_at
  BEFORE UPDATE ON public.visual_identities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();