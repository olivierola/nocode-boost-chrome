-- Drop existing policies for projects table
DROP POLICY IF EXISTS "Enable insert for authenticated users creating their own projec" ON public.projects;
DROP POLICY IF EXISTS "Enable select for users with access" ON public.projects;
DROP POLICY IF EXISTS "Enable update for project owners" ON public.projects;
DROP POLICY IF EXISTS "Enable delete for project owners" ON public.projects;

-- Recreate INSERT policy with proper name and check
CREATE POLICY "projects_insert_policy" ON public.projects
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = owner_id);

-- Recreate SELECT policy 
CREATE POLICY "projects_select_policy" ON public.projects
FOR SELECT 
TO authenticated 
USING (user_can_access_project(id));

-- Recreate UPDATE policy
CREATE POLICY "projects_update_policy" ON public.projects
FOR UPDATE 
TO authenticated 
USING (auth.uid() = owner_id);

-- Recreate DELETE policy
CREATE POLICY "projects_delete_policy" ON public.projects
FOR DELETE 
TO authenticated 
USING (auth.uid() = owner_id);