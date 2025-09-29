-- Ajouter les colonnes type et stack technique aux projets
ALTER TABLE public.projects 
ADD COLUMN project_type text DEFAULT 'web',
ADD COLUMN tech_stack text DEFAULT 'react',
ADD COLUMN framework_details jsonb DEFAULT '{}';

-- Ajouter des contraintes pour les valeurs valides
ALTER TABLE public.projects 
ADD CONSTRAINT projects_type_check 
CHECK (project_type IN ('web', 'mobile', 'desktop', 'ios', 'android', 'cross-platform'));

ALTER TABLE public.projects 
ADD CONSTRAINT projects_stack_check 
CHECK (tech_stack IN ('react', 'nextjs', 'vue', 'nuxt', 'angular', 'svelte', 'flutter', 'react-native', 'expo', 'electron', 'tauri', 'swift', 'kotlin', 'xamarin', 'ionic'));