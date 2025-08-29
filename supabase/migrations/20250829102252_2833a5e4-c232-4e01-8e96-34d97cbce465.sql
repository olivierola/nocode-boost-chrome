-- Créer les fonctions pour gérer l'historique de conversation
CREATE OR REPLACE FUNCTION public.get_conversation_history(p_project_id UUID, p_user_id UUID, p_conversation_type TEXT)
RETURNS TABLE(
  id UUID,
  role TEXT,
  content TEXT,
  plan_data JSONB,
  visual_identity_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ch.id,
    ch.role,
    ch.content,
    ch.plan_data,
    ch.visual_identity_data,
    ch.created_at
  FROM public.conversation_history ch
  WHERE ch.project_id = p_project_id 
    AND ch.user_id = p_user_id 
    AND ch.conversation_type = p_conversation_type
  ORDER BY ch.created_at ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.save_conversation_message(
  p_project_id UUID,
  p_user_id UUID,
  p_conversation_type TEXT,
  p_role TEXT,
  p_content TEXT,
  p_plan_data TEXT DEFAULT NULL,
  p_visual_identity_data TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO public.conversation_history (
    project_id,
    user_id,
    conversation_type,
    role,
    content,
    plan_data,
    visual_identity_data
  ) VALUES (
    p_project_id,
    p_user_id,
    p_conversation_type,
    p_role,
    p_content,
    CASE WHEN p_plan_data IS NOT NULL THEN p_plan_data::JSONB ELSE NULL END,
    CASE WHEN p_visual_identity_data IS NOT NULL THEN p_visual_identity_data::JSONB ELSE NULL END
  ) RETURNING id INTO new_id;
  
  RETURN new_id;
END;
$$;