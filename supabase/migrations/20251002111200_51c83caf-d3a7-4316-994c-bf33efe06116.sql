-- Create knowledge_base table for storing resources (docs, components, fonts, etc.)
CREATE TABLE IF NOT EXISTS public.knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  resource_type TEXT NOT NULL, -- 'documentation', 'component', 'font', 'color_palette', 'style_guide'
  name TEXT NOT NULL,
  description TEXT,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create agent_actions table to track all agent activities
CREATE TABLE IF NOT EXISTS public.agent_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  plan_id UUID REFERENCES public.plans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  action_type TEXT NOT NULL, -- 'modify_prompt', 'create_intermediate_step', 'use_knowledge', 'optimize_step'
  action_details JSONB NOT NULL DEFAULT '{}'::jsonb,
  step_index INTEGER,
  step_name TEXT,
  resources_used UUID[] DEFAULT ARRAY[]::UUID[],
  result TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create agent_progress_reports table
CREATE TABLE IF NOT EXISTS public.agent_progress_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  plan_id UUID REFERENCES public.plans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  report_markdown TEXT NOT NULL,
  summary TEXT,
  actions_covered UUID[] DEFAULT ARRAY[]::UUID[],
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_progress_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for knowledge_base
CREATE POLICY "Users can view knowledge base from accessible projects"
  ON public.knowledge_base FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      LEFT JOIN public.collaborators c ON p.id = c.project_id
      WHERE p.id = knowledge_base.project_id
      AND (p.owner_id = auth.uid() OR c.user_id = auth.uid())
    )
  );

CREATE POLICY "Users can manage knowledge base for accessible projects"
  ON public.knowledge_base FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      LEFT JOIN public.collaborators c ON p.id = c.project_id
      WHERE p.id = knowledge_base.project_id
      AND (p.owner_id = auth.uid() OR (c.user_id = auth.uid() AND c.role IN ('owner', 'collaborator')))
    )
  );

-- RLS Policies for agent_actions
CREATE POLICY "Users can view agent actions from accessible projects"
  ON public.agent_actions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      LEFT JOIN public.collaborators c ON p.id = c.project_id
      WHERE p.id = agent_actions.project_id
      AND (p.owner_id = auth.uid() OR c.user_id = auth.uid())
    )
  );

CREATE POLICY "Users can create agent actions for accessible projects"
  ON public.agent_actions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      LEFT JOIN public.collaborators c ON p.id = c.project_id
      WHERE p.id = agent_actions.project_id
      AND (p.owner_id = auth.uid() OR (c.user_id = auth.uid() AND c.role IN ('owner', 'collaborator')))
    )
  );

-- RLS Policies for agent_progress_reports
CREATE POLICY "Users can view progress reports from accessible projects"
  ON public.agent_progress_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      LEFT JOIN public.collaborators c ON p.id = c.project_id
      WHERE p.id = agent_progress_reports.project_id
      AND (p.owner_id = auth.uid() OR c.user_id = auth.uid())
    )
  );

CREATE POLICY "Users can manage progress reports for accessible projects"
  ON public.agent_progress_reports FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      LEFT JOIN public.collaborators c ON p.id = c.project_id
      WHERE p.id = agent_progress_reports.project_id
      AND (p.owner_id = auth.uid() OR (c.user_id = auth.uid() AND c.role IN ('owner', 'collaborator')))
    )
  );

-- Create indexes for performance
CREATE INDEX idx_knowledge_base_project ON public.knowledge_base(project_id);
CREATE INDEX idx_knowledge_base_type ON public.knowledge_base(resource_type);
CREATE INDEX idx_agent_actions_project ON public.agent_actions(project_id);
CREATE INDEX idx_agent_actions_plan ON public.agent_actions(plan_id);
CREATE INDEX idx_progress_reports_project ON public.agent_progress_reports(project_id);
CREATE INDEX idx_progress_reports_plan ON public.agent_progress_reports(plan_id);

-- Trigger to update updated_at
CREATE TRIGGER update_knowledge_base_updated_at
  BEFORE UPDATE ON public.knowledge_base
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_progress_reports_updated_at
  BEFORE UPDATE ON public.agent_progress_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();