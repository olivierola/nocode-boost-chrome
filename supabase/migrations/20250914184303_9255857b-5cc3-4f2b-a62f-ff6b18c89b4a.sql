-- Update plans table to support new structure
ALTER TABLE public.plans 
DROP COLUMN IF EXISTS etapes,
ADD COLUMN IF NOT EXISTS section1_vision_objectifs JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS section2_analyse_recherche JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS section3_cahier_charges JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS section4_architecture_produit JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS section5_architecture_application JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS section6_design_ux JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS section7_plan_technique JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS section8_roadmap_gestion JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS section9_tests_qualite JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS section10_deploiement JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS section11_business_monetisation JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS section12_securite_rgpd JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS section13_lancement_growth JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS section14_evolution_maintenance JSONB DEFAULT '{}';