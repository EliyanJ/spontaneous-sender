
-- 1. Enrichir ats_professions avec nouvelles colonnes
ALTER TABLE public.ats_professions
  ADD COLUMN IF NOT EXISTS category text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS aliases jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS excluded_words jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS last_trained_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS training_count integer DEFAULT 0;

-- 2. Créer table cv_analyses
CREATE TABLE public.cv_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  job_title text NOT NULL,
  job_description text NOT NULL,
  cv_text text NOT NULL,
  profession_id uuid REFERENCES public.ats_professions(id) ON DELETE SET NULL,
  profession_name text,
  total_score numeric NOT NULL DEFAULT 0,
  analysis_result jsonb NOT NULL DEFAULT '{}'::jsonb,
  admin_reviewed boolean NOT NULL DEFAULT false,
  admin_feedback jsonb DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cv_analyses ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage cv_analyses"
  ON public.cv_analyses FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Users can view their own analyses
CREATE POLICY "Users can view own cv_analyses"
  ON public.cv_analyses FOR SELECT
  USING (auth.uid() = user_id);

-- 3. Créer table ats_keyword_feedback
CREATE TABLE public.ats_keyword_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profession_id uuid NOT NULL REFERENCES public.ats_professions(id) ON DELETE CASCADE,
  keyword text NOT NULL,
  original_category text NOT NULL,
  corrected_category text NOT NULL,
  is_valid boolean NOT NULL DEFAULT true,
  admin_notes text,
  source text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ats_keyword_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage ats_keyword_feedback"
  ON public.ats_keyword_feedback FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Index for faster lookups
CREATE INDEX idx_cv_analyses_profession ON public.cv_analyses(profession_id);
CREATE INDEX idx_cv_analyses_reviewed ON public.cv_analyses(admin_reviewed);
CREATE INDEX idx_cv_analyses_created ON public.cv_analyses(created_at DESC);
CREATE INDEX idx_keyword_feedback_profession ON public.ats_keyword_feedback(profession_id);
