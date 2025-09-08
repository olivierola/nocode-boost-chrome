-- Create a dedicated table for plan generation chat history
CREATE TABLE public.plan_chat_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  user_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'standard' CHECK (message_type IN ('standard', 'clarification_needed', 'mindmap_plan', 'plan_generated')),
  plan_data JSONB,
  questions TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.plan_chat_history ENABLE ROW LEVEL SECURITY;

-- Create policies for plan chat history access
CREATE POLICY "Users can view their own plan chat history" 
ON public.plan_chat_history 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    LEFT JOIN public.collaborators c ON p.id = c.project_id
    WHERE p.id = plan_chat_history.project_id 
    AND (p.owner_id = auth.uid() OR c.user_id = auth.uid())
  )
);

CREATE POLICY "Users can create plan chat entries for accessible projects" 
ON public.plan_chat_history 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.projects p
    LEFT JOIN public.collaborators c ON p.id = c.project_id
    WHERE p.id = plan_chat_history.project_id 
    AND (p.owner_id = auth.uid() OR c.user_id = auth.uid())
  )
);

CREATE POLICY "Users can update their own plan chat entries" 
ON public.plan_chat_history 
FOR UPDATE 
USING (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.projects p
    LEFT JOIN public.collaborators c ON p.id = c.project_id
    WHERE p.id = plan_chat_history.project_id 
    AND (p.owner_id = auth.uid() OR c.user_id = auth.uid())
  )
);

CREATE POLICY "Users can delete their own plan chat entries" 
ON public.plan_chat_history 
FOR DELETE 
USING (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.projects p
    LEFT JOIN public.collaborators c ON p.id = c.project_id
    WHERE p.id = plan_chat_history.project_id 
    AND (p.owner_id = auth.uid() OR c.user_id = auth.uid())
  )
);

-- Create indexes for better performance
CREATE INDEX idx_plan_chat_history_project_user ON public.plan_chat_history(project_id, user_id);
CREATE INDEX idx_plan_chat_history_created_at ON public.plan_chat_history(created_at);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_plan_chat_history_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_plan_chat_history_updated_at
BEFORE UPDATE ON public.plan_chat_history
FOR EACH ROW
EXECUTE FUNCTION public.update_plan_chat_history_updated_at();

-- Create function to load plan chat history
CREATE OR REPLACE FUNCTION public.get_plan_chat_history(p_project_id uuid, p_user_id uuid)
RETURNS TABLE(
  id uuid, 
  role text, 
  content text, 
  message_type text,
  plan_data jsonb,
  questions text[],
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pch.id,
    pch.role,
    pch.content,
    pch.message_type,
    pch.plan_data,
    pch.questions,
    pch.created_at
  FROM public.plan_chat_history pch
  WHERE pch.project_id = p_project_id 
    AND EXISTS (
      SELECT 1 FROM public.projects p
      LEFT JOIN public.collaborators c ON p.id = c.project_id
      WHERE p.id = pch.project_id 
      AND (p.owner_id = p_user_id OR c.user_id = p_user_id)
    )
  ORDER BY pch.created_at ASC;
END;
$$;

-- Create function to save plan chat message
CREATE OR REPLACE FUNCTION public.save_plan_chat_message(
  p_project_id uuid, 
  p_user_id uuid, 
  p_role text, 
  p_content text, 
  p_message_type text DEFAULT 'standard',
  p_plan_data text DEFAULT NULL,
  p_questions text[] DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO public.plan_chat_history (
    project_id,
    user_id,
    role,
    content,
    message_type,
    plan_data,
    questions
  ) VALUES (
    p_project_id,
    p_user_id,
    p_role,
    p_content,
    p_message_type,
    CASE WHEN p_plan_data IS NOT NULL THEN p_plan_data::JSONB ELSE NULL END,
    p_questions
  ) RETURNING id INTO new_id;
  
  RETURN new_id;
END;
$$;