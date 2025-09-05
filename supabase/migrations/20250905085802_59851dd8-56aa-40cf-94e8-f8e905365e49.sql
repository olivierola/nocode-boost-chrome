-- Fix foreign key relationship between collaborators and profiles
-- First, let's add a foreign key to link user_id to auth.users
ALTER TABLE public.collaborators 
ADD CONSTRAINT collaborators_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Also ensure the profiles table is properly linked to auth.users
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_user_id_fkey;

ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;