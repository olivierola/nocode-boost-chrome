-- Create RPC functions for posts management with fixed parameter names
CREATE OR REPLACE FUNCTION get_posts_for_project(p_project_id UUID)
RETURNS TABLE(
  id UUID,
  user_id UUID,
  project_id UUID,
  content TEXT,
  tone TEXT,
  subject TEXT,
  post_type TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.user_id,
    p.project_id,
    p.content,
    p.tone,
    p.subject,
    p.post_type,
    p.metadata,
    p.created_at,
    p.updated_at
  FROM public.posts p
  WHERE p.project_id = p_project_id
  AND EXISTS (
    SELECT 1 FROM projects pr
    LEFT JOIN collaborators c ON pr.id = c.project_id
    WHERE pr.id = p.project_id 
    AND (pr.owner_id = auth.uid() OR c.user_id = auth.uid())
  )
  ORDER BY p.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION delete_post(p_post_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.posts p
  WHERE p.id = p_post_id
  AND EXISTS (
    SELECT 1 FROM projects pr
    LEFT JOIN collaborators c ON pr.id = c.project_id
    WHERE pr.id = p.project_id 
    AND (pr.owner_id = auth.uid() OR c.user_id = auth.uid())
  );
  
  RETURN FOUND;
END;
$$;