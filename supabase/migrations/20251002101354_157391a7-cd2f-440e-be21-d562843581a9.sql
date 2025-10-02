-- Create table for project documentation
CREATE TABLE IF NOT EXISTS public.project_documentation (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  documentation_markdown TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id)
);

-- Enable Row Level Security
ALTER TABLE public.project_documentation ENABLE ROW LEVEL SECURITY;

-- Create policies for project documentation
CREATE POLICY "Users can view documentation for their projects"
ON public.project_documentation
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = project_documentation.project_id
    AND projects.owner_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.collaborators
    WHERE collaborators.project_id = project_documentation.project_id
    AND collaborators.user_id = auth.uid()
  )
);

CREATE POLICY "Project owners can insert documentation"
ON public.project_documentation
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = project_documentation.project_id
    AND projects.owner_id = auth.uid()
  )
);

CREATE POLICY "Project owners can update documentation"
ON public.project_documentation
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = project_documentation.project_id
    AND projects.owner_id = auth.uid()
  )
);

CREATE POLICY "Project owners can delete documentation"
ON public.project_documentation
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = project_documentation.project_id
    AND projects.owner_id = auth.uid()
  )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_project_documentation_updated_at
BEFORE UPDATE ON public.project_documentation
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_project_documentation_project_id ON public.project_documentation(project_id);
