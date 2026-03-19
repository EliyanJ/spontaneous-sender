
-- ============================================================
-- 1. email_campaigns : ajouter colonnes si absentes (idempotent)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'email_campaigns' AND column_name = 'admin_score'
  ) THEN
    ALTER TABLE public.email_campaigns ADD COLUMN admin_score INTEGER CHECK (admin_score BETWEEN 1 AND 5);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'email_campaigns' AND column_name = 'admin_notes'
  ) THEN
    ALTER TABLE public.email_campaigns ADD COLUMN admin_notes TEXT;
  END IF;
END $$;

-- ============================================================
-- 2. email_subject_examples : créer si absente, recréer policies
-- ============================================================
CREATE TABLE IF NOT EXISTS public.email_subject_examples (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_text TEXT        NOT NULL,
  context_data JSONB       DEFAULT '{}'::jsonb,
  admin_score  INTEGER     NOT NULL CHECK (admin_score BETWEEN 1 AND 5),
  campaign_id  UUID        REFERENCES public.email_campaigns(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.email_subject_examples ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can select email_subject_examples"  ON public.email_subject_examples;
DROP POLICY IF EXISTS "Admins can insert email_subject_examples"  ON public.email_subject_examples;
DROP POLICY IF EXISTS "Admins can update email_subject_examples"  ON public.email_subject_examples;
DROP POLICY IF EXISTS "Admins can delete email_subject_examples"  ON public.email_subject_examples;

CREATE POLICY "Admins can select email_subject_examples"
  ON public.email_subject_examples FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert email_subject_examples"
  ON public.email_subject_examples FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update email_subject_examples"
  ON public.email_subject_examples FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete email_subject_examples"
  ON public.email_subject_examples FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- 3. cover_letter_templates : NOUVELLE TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.cover_letter_templates (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT        NOT NULL,
  content      TEXT        NOT NULL,
  sector_tags  TEXT[]      DEFAULT '{}'::text[],
  tone         TEXT,
  is_active    BOOLEAN     NOT NULL DEFAULT true,
  usage_count  INTEGER     NOT NULL DEFAULT 0,
  admin_notes  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.cover_letter_templates ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.handle_cover_letter_templates_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_cover_letter_templates_updated_at ON public.cover_letter_templates;

CREATE TRIGGER update_cover_letter_templates_updated_at
  BEFORE UPDATE ON public.cover_letter_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_cover_letter_templates_updated_at();

DROP POLICY IF EXISTS "Authenticated users can read cover_letter_templates" ON public.cover_letter_templates;
CREATE POLICY "Authenticated users can read cover_letter_templates"
  ON public.cover_letter_templates FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can insert cover_letter_templates" ON public.cover_letter_templates;
CREATE POLICY "Admins can insert cover_letter_templates"
  ON public.cover_letter_templates FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can update cover_letter_templates" ON public.cover_letter_templates;
CREATE POLICY "Admins can update cover_letter_templates"
  ON public.cover_letter_templates FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can delete cover_letter_templates" ON public.cover_letter_templates;
CREATE POLICY "Admins can delete cover_letter_templates"
  ON public.cover_letter_templates FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));
