-- Supprimer TOUTES les policies de la table projects
DROP POLICY IF EXISTS "projects_insert_policy" ON public.projects;
DROP POLICY IF EXISTS "projects_select_policy" ON public.projects;
DROP POLICY IF EXISTS "projects_update_policy" ON public.projects;
DROP POLICY IF EXISTS "projects_delete_policy" ON public.projects;

-- Supprimer toute autre policy qui pourrait exister
DROP POLICY IF EXISTS "Enable insert for authenticated users creating their own projec" ON public.projects;
DROP POLICY IF EXISTS "Enable select for users with access" ON public.projects;
DROP POLICY IF EXISTS "Enable update for project owners" ON public.projects;
DROP POLICY IF EXISTS "Enable delete for project owners" ON public.projects;
DROP POLICY IF EXISTS "Users can insert their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can view their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can delete their own projects" ON public.projects;

-- Créer des policies simples et claires
CREATE POLICY "allow_insert_own_projects" ON public.projects
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "allow_select_accessible_projects" ON public.projects
FOR SELECT 
TO authenticated 
USING (
  auth.uid() = owner_id 
  OR 
  EXISTS (
    SELECT 1 FROM public.collaborators 
    WHERE project_id = projects.id AND user_id = auth.uid()
  )
);

CREATE POLICY "allow_update_own_projects" ON public.projects
FOR UPDATE 
TO authenticated 
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "allow_delete_own_projects" ON public.projects
FOR DELETE 
TO authenticated 
USING (auth.uid() = owner_id);