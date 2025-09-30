-- Add foreign key relationship between collaborators and profiles
ALTER TABLE public.collaborators 
ADD CONSTRAINT fk_collaborators_user_id 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(user_id) 
ON DELETE CASCADE;