-- Ajouter une colonne notes pour les commentaires sur les entreprises
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS notes TEXT;