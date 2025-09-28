-- Supprimer et recréer la fonction avec le bon type de retour
DROP FUNCTION IF EXISTS public.get_user_plan_limits(text);

-- Ajouter la colonne storage_limit_mb si elle n'existe pas
ALTER TABLE public.subscription_plans 
ADD COLUMN IF NOT EXISTS storage_limit_mb INTEGER DEFAULT 1024;

-- Mettre à jour les valeurs des plans
UPDATE subscription_plans SET monthly_plan_generations = 10, monthly_visual_identity = 5, monthly_media_uploads = 20, storage_limit_mb = 512 WHERE name = 'free';
UPDATE subscription_plans SET monthly_plan_generations = 100, monthly_visual_identity = 50, monthly_media_uploads = 200, storage_limit_mb = 5120 WHERE name = 'pro';
UPDATE subscription_plans SET monthly_plan_generations = 300, monthly_visual_identity = 150, monthly_media_uploads = 500, storage_limit_mb = 15360 WHERE name = 'premium';

-- Recréer la fonction avec la nouvelle signature
CREATE OR REPLACE FUNCTION public.get_user_plan_limits(user_email text)
RETURNS TABLE(
  plan_name text, 
  monthly_plan_generations integer, 
  monthly_visual_identity integer, 
  monthly_media_uploads integer, 
  monthly_post_generations integer, 
  collaboration_enabled boolean,
  storage_limit_mb integer
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
    sp.monthly_plan_generations as monthly_post_generations,
    sp.collaboration_enabled,
    sp.storage_limit_mb
  FROM public.subscription_plans sp
  LEFT JOIN public.subscribers s ON s.subscription_tier = sp.name
  WHERE s.email = user_email
     OR (s.email IS NULL AND sp.name = 'free');
END;
$$;