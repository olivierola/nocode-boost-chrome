-- Simplifier la table plans en gardant seulement id, project_id et plan_data
-- Sauvegarder les données existantes dans plan_data avant de supprimer les colonnes

-- Créer une colonne temporaire pour migrer les données
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS temp_plan_data jsonb;

-- Migrer les données existantes vers le nouveau format JSON
UPDATE public.plans SET temp_plan_data = jsonb_build_object(
  'title', title,
  'description', description,
  'status', status,
  'plan_type', plan_type,
  'user_id', user_id,
  'mindmap_data', mindmap_data,
  'section1_vision_objectifs', section1_vision_objectifs,
  'section2_analyse_recherche', section2_analyse_recherche,
  'section3_cahier_charges', section3_cahier_charges,
  'section4_architecture_produit', section4_architecture_produit,
  'section5_architecture_application', section5_architecture_application,
  'section6_design_ux', section6_design_ux,
  'section7_plan_technique', section7_plan_technique,
  'section8_roadmap_gestion', section8_roadmap_gestion,
  'section9_tests_qualite', section9_tests_qualite,
  'section10_deploiement', section10_deploiement,
  'section11_business_monetisation', section11_business_monetisation,
  'section12_securite_rgpd', section12_securite_rgpd,
  'section13_lancement_growth', section13_lancement_growth,
  'section14_evolution_maintenance', section14_evolution_maintenance
) WHERE temp_plan_data IS NULL;

-- Remplacer plan_data par les données migrées
UPDATE public.plans SET plan_data = temp_plan_data WHERE temp_plan_data IS NOT NULL;

-- Supprimer toutes les colonnes obsolètes
ALTER TABLE public.plans 
DROP COLUMN IF EXISTS title,
DROP COLUMN IF EXISTS description,
DROP COLUMN IF EXISTS status,
DROP COLUMN IF EXISTS plan_type,
DROP COLUMN IF EXISTS user_id,
DROP COLUMN IF EXISTS mindmap_data,
DROP COLUMN IF EXISTS section1_vision_objectifs,
DROP COLUMN IF EXISTS section2_analyse_recherche,
DROP COLUMN IF EXISTS section3_cahier_charges,
DROP COLUMN IF EXISTS section4_architecture_produit,
DROP COLUMN IF EXISTS section5_architecture_application,
DROP COLUMN IF EXISTS section6_design_ux,
DROP COLUMN IF EXISTS section7_plan_technique,
DROP COLUMN IF EXISTS section8_roadmap_gestion,
DROP COLUMN IF EXISTS section9_tests_qualite,
DROP COLUMN IF EXISTS section10_deploiement,
DROP COLUMN IF EXISTS section11_business_monetisation,
DROP COLUMN IF EXISTS section12_securite_rgpd,
DROP COLUMN IF EXISTS section13_lancement_growth,
DROP COLUMN IF EXISTS section14_evolution_maintenance,
DROP COLUMN IF EXISTS temp_plan_data;

-- S'assurer que plan_data n'est pas null et a une valeur par défaut
ALTER TABLE public.plans ALTER COLUMN plan_data SET NOT NULL;
ALTER TABLE public.plans ALTER COLUMN plan_data SET DEFAULT '{}'::jsonb;