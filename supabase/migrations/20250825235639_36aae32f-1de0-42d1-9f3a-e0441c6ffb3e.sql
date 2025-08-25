-- Check if RLS is enabled and recreate all policies properly
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can create their own projects" ON public.projects;
DROP POLICY IF EXISTS "Project owners can update their projects" ON public.projects;
DROP POLICY IF EXISTS "Project owners can delete their projects" ON public.projects;
DROP POLICY IF EXISTS "Users can view projects they own or collaborate on" ON public.projects;

-- Recreate INSERT policy with explicit check
CREATE POLICY "Enable insert for authenticated users creating their own projects" 
ON public.projects 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = owner_id);

-- Recreate other policies
CREATE POLICY "Enable select for users with access" 
ON public.projects 
FOR SELECT 
TO authenticated
USING (public.user_can_access_project(id));

CREATE POLICY "Enable update for project owners" 
ON public.projects 
FOR UPDATE 
TO authenticated
USING (auth.uid() = owner_id);

CREATE POLICY "Enable delete for project owners" 
ON public.projects 
FOR DELETE 
TO authenticated
USING (auth.uid() = owner_id);