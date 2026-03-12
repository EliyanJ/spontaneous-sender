-- Add hierarchy columns to ats_professions
ALTER TABLE public.ats_professions 
  ADD COLUMN IF NOT EXISTS parent_theme_id uuid REFERENCES public.ats_professions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_theme boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS profession_status text NOT NULL DEFAULT 'active';

-- Index for fast hierarchy lookups
CREATE INDEX IF NOT EXISTS idx_ats_professions_parent ON public.ats_professions(parent_theme_id);
CREATE INDEX IF NOT EXISTS idx_ats_professions_status ON public.ats_professions(profession_status);
CREATE INDEX IF NOT EXISTS idx_ats_professions_is_theme ON public.ats_professions(is_theme);

-- Mark existing entries as themes by default (they were flat root-level entries)
UPDATE public.ats_professions SET is_theme = true WHERE parent_theme_id IS NULL;

-- Add needs_profession_suggestion flag to cv_analyses for unknown profession detection
ALTER TABLE public.cv_analyses
  ADD COLUMN IF NOT EXISTS needs_profession_suggestion boolean NOT NULL DEFAULT false;