-- Ajouter le stockage du CV dans le profil utilisateur
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS cv_content TEXT DEFAULT NULL;

COMMENT ON COLUMN public.profiles.cv_content IS 'Contenu textuel du CV pour personnalisation IA';