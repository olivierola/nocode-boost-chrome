-- Create subscribers table for subscription management
CREATE TABLE public.subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  stripe_customer_id TEXT,
  subscribed BOOLEAN NOT NULL DEFAULT false,
  subscription_tier TEXT DEFAULT 'free',
  subscription_end TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create usage tracking table
CREATE TABLE public.usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- 'plan_generation', 'visual_identity', 'media_upload'
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  month_year TEXT NOT NULL DEFAULT to_char(now(), 'YYYY-MM') -- For monthly limits
);

-- Create subscription plans configuration table
CREATE TABLE public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  monthly_plan_generations INTEGER,
  monthly_visual_identity INTEGER,
  monthly_media_uploads INTEGER,
  collaboration_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- Subscribers policies
CREATE POLICY "select_own_subscription" ON public.subscribers
FOR SELECT
USING (user_id = auth.uid() OR email = auth.email());

CREATE POLICY "update_own_subscription" ON public.subscribers
FOR UPDATE
USING (true);

CREATE POLICY "insert_subscription" ON public.subscribers
FOR INSERT
WITH CHECK (true);

-- Usage tracking policies
CREATE POLICY "select_own_usage" ON public.usage_tracking
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "insert_own_usage" ON public.usage_tracking
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Subscription plans policies (read-only for users)
CREATE POLICY "view_subscription_plans" ON public.subscription_plans
FOR SELECT
USING (true);

-- Insert default subscription plans
INSERT INTO public.subscription_plans (name, monthly_plan_generations, monthly_visual_identity, monthly_media_uploads, collaboration_enabled) VALUES
('free', 5, 2, 10, false),
('starter', 50, 10, 100, false),
('pro', -1, -1, -1, true); -- -1 means unlimited

-- Create function to get user's current plan limits
CREATE OR REPLACE FUNCTION public.get_user_plan_limits(user_email TEXT)
RETURNS TABLE (
  plan_name TEXT,
  monthly_plan_generations INTEGER,
  monthly_visual_identity INTEGER,
  monthly_media_uploads INTEGER,
  collaboration_enabled BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sp.name,
    sp.monthly_plan_generations,
    sp.monthly_visual_identity,
    sp.monthly_media_uploads,
    sp.collaboration_enabled
  FROM public.subscription_plans sp
  LEFT JOIN public.subscribers s ON s.subscription_tier = sp.name
  WHERE s.email = user_email
     OR (s.email IS NULL AND sp.name = 'free');
END;
$$;

-- Create function to check usage limits
CREATE OR REPLACE FUNCTION public.check_usage_limit(
  p_user_id UUID,
  p_action_type TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- Create function to record usage
CREATE OR REPLACE FUNCTION public.record_usage(
  p_user_id UUID,
  p_action_type TEXT,
  p_project_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.usage_tracking (user_id, action_type, project_id)
  VALUES (p_user_id, p_action_type, p_project_id);
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;