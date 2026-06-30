CREATE INDEX IF NOT EXISTS idx_keyword_feedback_profession_valid
  ON public.ats_keyword_feedback (profession_id, is_valid);