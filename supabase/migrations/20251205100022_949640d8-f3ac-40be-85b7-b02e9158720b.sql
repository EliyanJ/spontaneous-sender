-- Ajouter la colonne company_insights à la table companies
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS company_insights JSONB DEFAULT NULL;

-- Commentaire explicatif
COMMENT ON COLUMN public.companies.company_insights IS 'Insights extraits du site web de l''entreprise pour personnalisation des emails';