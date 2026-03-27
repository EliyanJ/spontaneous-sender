ALTER TABLE public.companies 
  ADD COLUMN IF NOT EXISTS email_source text,
  ADD COLUMN IF NOT EXISTS hunter_attempted boolean DEFAULT false;