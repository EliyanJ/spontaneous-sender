
-- Add new columns for HTML-first template system
ALTER TABLE public.cv_templates
  ADD COLUMN IF NOT EXISTS template_schema JSONB,
  ADD COLUMN IF NOT EXISTS has_photo BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS template_version TEXT DEFAULT 'html-v1';

-- Index for fast filtering of active templates
CREATE INDEX IF NOT EXISTS idx_cv_templates_active
  ON public.cv_templates (is_active) WHERE is_active = true;

-- Mark existing canvas-v2 templates with their version
UPDATE public.cv_templates
  SET template_version = 'canvas-v2'
  WHERE html_template LIKE '%"version":"canvas-v2"%'
    AND (template_version IS NULL OR template_version = 'html-v1');
