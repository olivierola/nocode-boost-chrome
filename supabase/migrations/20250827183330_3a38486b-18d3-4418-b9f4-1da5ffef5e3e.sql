-- Mise à jour de la table plans pour supporter la structure mindmap
ALTER TABLE plans 
ADD COLUMN mindmap_data JSONB DEFAULT '{}'::jsonb,
ADD COLUMN plan_type TEXT DEFAULT 'standard'::text;

-- Index pour optimiser les requêtes sur mindmap_data
CREATE INDEX idx_plans_mindmap_data ON plans USING GIN(mindmap_data);

-- Commentaire pour documenter les nouvelles colonnes
COMMENT ON COLUMN plans.mindmap_data IS 'Structure de données complète pour la mindmap incluant branches, features, pages, identité visuelle, etc.';
COMMENT ON COLUMN plans.plan_type IS 'Type de plan: standard (ancien format) ou mindmap (nouveau format avec structure complète)';