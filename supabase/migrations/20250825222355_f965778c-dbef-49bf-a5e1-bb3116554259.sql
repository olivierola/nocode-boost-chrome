-- Fix infinite recursion in RLS policies

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view collaborators from accessible projects" ON public.collaborators;
DROP POLICY IF EXISTS "Users can view projects they own or collaborate on" ON public.projects;

-- Recreate the policies without recursion issues

-- Projects policies
CREATE POLICY "Users can view projects they own or collaborate on" 
ON public.projects 
FOR SELECT 
USING (
  owner_id = auth.uid() 
  OR 
  id IN (
    SELECT project_id 
    FROM public.collaborators 
    WHERE user_id = auth.uid()
  )
);

-- Collaborators policies  
CREATE POLICY "Users can view collaborators from accessible projects" 
ON public.collaborators 
FOR SELECT 
USING (
  user_id = auth.uid() 
  OR 
  project_id IN (
    SELECT id 
    FROM public.projects 
    WHERE owner_id = auth.uid()
  )
);