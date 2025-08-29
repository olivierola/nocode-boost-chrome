-- Create notifications table for real-time notifications
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('success', 'error', 'info', 'warning')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (true);

-- Create function to notify plan step completion
CREATE OR REPLACE FUNCTION notify_plan_step_completion(
  p_user_id UUID,
  p_plan_id UUID,
  p_step_name TEXT,
  p_step_index INTEGER,
  p_total_steps INTEGER
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    message,
    metadata
  ) VALUES (
    p_user_id,
    'success',
    'Étape terminée',
    'Étape "' || p_step_name || '" complétée (' || p_step_index || '/' || p_total_steps || ')',
    jsonb_build_object(
      'plan_id', p_plan_id,
      'step_name', p_step_name,
      'step_index', p_step_index,
      'total_steps', p_total_steps,
      'notification_type', 'plan_step_completion'
    )
  ) RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$;

-- Create function to notify plan completion
CREATE OR REPLACE FUNCTION notify_plan_completion(
  p_user_id UUID,
  p_plan_id UUID,
  p_plan_title TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    message,
    metadata
  ) VALUES (
    p_user_id,
    'success',
    'Plan terminé',
    'Le plan "' || p_plan_title || '" a été complété avec succès',
    jsonb_build_object(
      'plan_id', p_plan_id,
      'plan_title', p_plan_title,
      'notification_type', 'plan_completion'
    )
  ) RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$;

-- Add notifications table to realtime publication
ALTER publication supabase_realtime ADD TABLE public.notifications;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_notifications_updated_at
BEFORE UPDATE ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();