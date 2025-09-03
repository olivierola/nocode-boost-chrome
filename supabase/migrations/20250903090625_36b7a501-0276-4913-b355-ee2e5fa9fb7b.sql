-- Create posts table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_id UUID NOT NULL,
  content TEXT NOT NULL,
  tone TEXT NOT NULL,
  subject TEXT NOT NULL,
  post_type TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- Create policies for posts
CREATE POLICY "Users can view posts from accessible projects" 
ON public.posts 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM projects p
    LEFT JOIN collaborators c ON p.id = c.project_id
    WHERE p.id = posts.project_id 
    AND (p.owner_id = auth.uid() OR c.user_id = auth.uid())
  )
);

CREATE POLICY "Project owners and collaborators can manage posts" 
ON public.posts 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM projects p
    LEFT JOIN collaborators c ON p.id = c.project_id
    WHERE p.id = posts.project_id 
    AND (
      p.owner_id = auth.uid() OR 
      (c.user_id = auth.uid() AND c.role IN ('owner', 'collaborator'))
    )
  )
);