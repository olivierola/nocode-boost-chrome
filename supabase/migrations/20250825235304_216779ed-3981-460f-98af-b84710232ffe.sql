-- Add missing INSERT policy for projects
DROP POLICY IF EXISTS "Users can create their own projects" ON public.projects;

CREATE POLICY "Users can create their own projects" 
ON public.projects 
FOR INSERT 
WITH CHECK (auth.uid() = owner_id);

-- Also ensure UPDATE and DELETE policies exist
DROP POLICY IF EXISTS "Project owners can update their projects" ON public.projects;
DROP POLICY IF EXISTS "Project owners can delete their projects" ON public.projects;

CREATE POLICY "Project owners can update their projects" 
ON public.projects 
FOR UPDATE 
USING (auth.uid() = owner_id);

CREATE POLICY "Project owners can delete their projects" 
ON public.projects 
FOR DELETE 
USING (auth.uid() = owner_id);