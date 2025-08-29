-- Créer la table conversation_history pour sauvegarder les historiques de chat
CREATE TABLE public.conversation_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  user_id UUID NOT NULL,
  conversation_type TEXT NOT NULL CHECK (conversation_type IN ('plan', 'visual_identity')),
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  plan_data JSONB,
  visual_identity_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Activer Row Level Security
ALTER TABLE public.conversation_history ENABLE ROW LEVEL SECURITY;

-- Politique pour que les utilisateurs ne voient que leurs propres conversations
CREATE POLICY "Users can view their own conversation history" 
ON public.conversation_history 
FOR SELECT 
USING (auth.uid() = user_id);

-- Politique pour que les utilisateurs puissent créer leurs propres entrées
CREATE POLICY "Users can create their own conversation entries" 
ON public.conversation_history 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Politique pour que les utilisateurs puissent modifier leurs propres entrées
CREATE POLICY "Users can update their own conversation entries" 
ON public.conversation_history 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Politique pour que les utilisateurs puissent supprimer leurs propres entrées
CREATE POLICY "Users can delete their own conversation entries" 
ON public.conversation_history 
FOR DELETE 
USING (auth.uid() = user_id);

-- Ajouter des index pour améliorer les performances
CREATE INDEX idx_conversation_history_project_user ON public.conversation_history (project_id, user_id);
CREATE INDEX idx_conversation_history_type ON public.conversation_history (conversation_type);
CREATE INDEX idx_conversation_history_created_at ON public.conversation_history (created_at);

-- Créer fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION public.update_conversation_history_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer trigger pour updated_at
CREATE TRIGGER update_conversation_history_updated_at
  BEFORE UPDATE ON public.conversation_history
  FOR EACH ROW
  EXECUTE FUNCTION public.update_conversation_history_updated_at();

-- Modifier la table plans pour ajouter les nouvelles colonnes mindmap
ALTER TABLE public.plans 
ADD COLUMN IF NOT EXISTS mindmap_data JSONB,
ADD COLUMN IF NOT EXISTS plan_type TEXT DEFAULT 'simple' CHECK (plan_type IN ('simple', 'mindmap'));