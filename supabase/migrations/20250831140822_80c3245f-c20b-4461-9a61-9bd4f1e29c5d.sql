-- Create posts table to store generated tweets
CREATE TABLE public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  project_id UUID NOT NULL,
  content TEXT NOT NULL,
  tone TEXT NOT NULL,
  subject TEXT NOT NULL,
  post_type TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- Create policies for posts
CREATE POLICY "Users can view posts from accessible projects" 
ON public.posts 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM projects p
  LEFT JOIN collaborators c ON p.id = c.project_id
  WHERE p.id = posts.project_id 
  AND (p.owner_id = auth.uid() OR c.user_id = auth.uid())
));

CREATE POLICY "Users can create posts for accessible projects" 
ON public.posts 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM projects p
  LEFT JOIN collaborators c ON p.id = c.project_id
  WHERE p.id = posts.project_id 
  AND (p.owner_id = auth.uid() OR (c.user_id = auth.uid() AND c.role = ANY(ARRAY['owner'::text, 'collaborator'::text])))
));

CREATE POLICY "Users can update posts from accessible projects" 
ON public.posts 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM projects p
  LEFT JOIN collaborators c ON p.id = c.project_id
  WHERE p.id = posts.project_id 
  AND (p.owner_id = auth.uid() OR (c.user_id = auth.uid() AND c.role = ANY(ARRAY['owner'::text, 'collaborator'::text])))
));

CREATE POLICY "Users can delete posts from accessible projects" 
ON public.posts 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM projects p
  LEFT JOIN collaborators c ON p.id = c.project_id
  WHERE p.id = posts.project_id 
  AND (p.owner_id = auth.uid() OR (c.user_id = auth.uid() AND c.role = ANY(ARRAY['owner'::text, 'collaborator'::text])))
));

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_posts_updated_at
BEFORE UPDATE ON public.posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update subscription plans to include post generation limits
UPDATE public.subscription_plans 
SET monthly_plan_generations = 10 
WHERE name = 'free';

ALTER TABLE public.subscription_plans 
ADD COLUMN monthly_post_generations INTEGER DEFAULT 10;

UPDATE public.subscription_plans 
SET monthly_post_generations = 10 
WHERE name = 'free';

UPDATE public.subscription_plans 
SET monthly_post_generations = 100 
WHERE name = 'starter';

UPDATE public.subscription_plans 
SET monthly_post_generations = -1 
WHERE name = 'pro';

-- Update the get_user_plan_limits function to include post limits
CREATE OR REPLACE FUNCTION public.get_user_plan_limits(user_email text)
RETURNS TABLE(
  plan_name text, 
  monthly_plan_generations integer, 
  monthly_visual_identity integer, 
  monthly_media_uploads integer, 
  monthly_post_generations integer,
  collaboration_enabled boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    sp.name,
    sp.monthly_plan_generations,
    sp.monthly_visual_identity,
    sp.monthly_media_uploads,
    sp.monthly_post_generations,
    sp.collaboration_enabled
  FROM public.subscription_plans sp
  LEFT JOIN public.subscribers s ON s.subscription_tier = sp.name
  WHERE s.email = user_email
     OR (s.email IS NULL AND sp.name = 'free');
END;
$function$;

-- Update check_usage_limit function to include post generation
CREATE OR REPLACE FUNCTION public.check_usage_limit(p_user_id uuid, p_action_type text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  current_month TEXT;
  usage_count INTEGER;
  plan_limit INTEGER;
  user_email TEXT;
  plan_data RECORD;
BEGIN
  -- Get current month
  current_month := to_char(now(), 'YYYY-MM');
  
  -- Get user email
  SELECT email INTO user_email FROM auth.users WHERE id = p_user_id;
  
  -- Get user's plan limits
  SELECT * INTO plan_data FROM public.get_user_plan_limits(user_email);
  
  -- Get appropriate limit based on action type
  CASE p_action_type
    WHEN 'plan_generation' THEN
      plan_limit := plan_data.monthly_plan_generations;
    WHEN 'visual_identity' THEN
      plan_limit := plan_data.monthly_visual_identity;
    WHEN 'media_upload' THEN
      plan_limit := plan_data.monthly_media_uploads;
    WHEN 'post_generation' THEN
      plan_limit := plan_data.monthly_post_generations;
    ELSE
      RETURN false;
  END CASE;
  
  -- If unlimited (-1), always allow
  IF plan_limit = -1 THEN
    RETURN true;
  END IF;
  
  -- Count current usage for this month
  SELECT COUNT(*) INTO usage_count
  FROM public.usage_tracking
  WHERE user_id = p_user_id 
    AND action_type = p_action_type 
    AND month_year = current_month;
  
  -- Check if under limit
  RETURN usage_count < plan_limit;
END;
$function$;