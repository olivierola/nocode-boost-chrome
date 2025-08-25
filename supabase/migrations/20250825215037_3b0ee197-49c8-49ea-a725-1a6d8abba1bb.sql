-- Ajouter une colonne status aux plans pour gérer l'état de validation
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';

-- Créer un index sur le statut pour les requêtes filtrées
CREATE INDEX IF NOT EXISTS idx_plans_status ON public.plans(status);

-- Créer une contrainte pour s'assurer que le statut est valide
ALTER TABLE public.plans ADD CONSTRAINT check_plans_status 
CHECK (status IN ('draft', 'validated', 'executing', 'completed'));

-- Ajouter une colonne updated_at si elle n'existe pas
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Créer ou mettre à jour la fonction de mise à jour automatique du timestamp
CREATE OR REPLACE FUNCTION public.update_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger pour mettre à jour automatiquement updated_at
DROP TRIGGER IF EXISTS update_plans_updated_at_trigger ON public.plans;
CREATE TRIGGER update_plans_updated_at_trigger
  BEFORE UPDATE ON public.plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_plans_updated_at();

-- Mettre à jour les plans existants pour avoir le statut 'draft' par défaut
UPDATE public.plans SET status = 'draft' WHERE status IS NULL;