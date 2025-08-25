-- First drop policies that depend on the functions
DROP POLICY IF EXISTS "Users can view projects they own or collaborate on" ON public.projects;
DROP POLICY IF EXISTS "Users can view collaborators from accessible projects" ON public.collaborators;
DROP POLICY IF EXISTS "Project owners can manage collaborators" ON public.collaborators;

-- Now drop the functions
DROP FUNCTION IF EXISTS public.user_can_access_project(UUID);
DROP FUNCTION IF EXISTS public.user_owns_project(UUID);

-- Recreate functions with clearer parameter names
CREATE OR REPLACE FUNCTION public.user_can_access_project(_project_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user owns the project
  IF EXISTS (
    SELECT 1 FROM public.projects 
    WHERE id = _project_id AND owner_id = auth.uid()
  ) THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user is a collaborator
  IF EXISTS (
    SELECT 1 FROM public.collaborators 
    WHERE project_id = _project_id AND user_id = auth.uid()
  ) THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.user_owns_project(_project_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.projects 
    WHERE id = _project_id AND owner_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Recreate policies using the corrected functions
CREATE POLICY "Users can view projects they own or collaborate on" 
ON public.projects 
FOR SELECT 
USING (public.user_can_access_project(id));

CREATE POLICY "Users can view collaborators from accessible projects" 
ON public.collaborators 
FOR SELECT 
USING (
  user_id = auth.uid() 
  OR 
  public.user_owns_project(project_id)
);

CREATE POLICY "Project owners can manage collaborators" 
ON public.collaborators 
FOR ALL 
USING (public.user_owns_project(project_id));