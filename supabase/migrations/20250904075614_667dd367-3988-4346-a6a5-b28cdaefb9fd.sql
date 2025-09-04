-- Add missing table for tracking usage of post generation
ALTER TABLE public.usage_tracking DROP CONSTRAINT IF EXISTS usage_tracking_action_type_check;
ALTER TABLE public.usage_tracking ADD CONSTRAINT usage_tracking_action_type_check 
CHECK (action_type IN ('plan_generation', 'visual_identity', 'media_upload', 'post_generation'));