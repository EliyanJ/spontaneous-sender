-- Add pipeline_stage column to companies table
ALTER TABLE public.companies 
ADD COLUMN pipeline_stage text DEFAULT 'nouveau' CHECK (pipeline_stage IN (
  'nouveau',
  'candidature_envoyee',
  'en_attente',
  'relance',
  'entretien',
  'offre_recue',
  'refuse',
  'accepte'
));

-- Add index for better query performance
CREATE INDEX idx_companies_pipeline_stage ON public.companies(pipeline_stage);

-- Add updated_at trigger if not exists (for tracking stage changes)
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();