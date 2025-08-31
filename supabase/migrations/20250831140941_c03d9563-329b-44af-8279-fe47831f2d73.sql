-- Drop and recreate the function with new signature
DROP FUNCTION IF EXISTS public.get_user_plan_limits(text);

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