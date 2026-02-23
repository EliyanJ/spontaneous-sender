
-- Table: cv_templates (sector-specific HTML/CSS templates)
CREATE TABLE public.cv_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sector text NOT NULL,
  html_template text NOT NULL DEFAULT '',
  css_styles text NOT NULL DEFAULT '',
  thumbnail_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cv_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read active templates"
  ON public.cv_templates FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage templates"
  ON public.cv_templates FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Table: cv_sector_phrases (AI training phrases by sector)
CREATE TABLE public.cv_sector_phrases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sector text NOT NULL,
  category text NOT NULL,
  phrase text NOT NULL,
  context text,
  keywords jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cv_sector_phrases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read sector phrases"
  ON public.cv_sector_phrases FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage sector phrases"
  ON public.cv_sector_phrases FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Table: user_generated_cvs (user-saved CVs)
CREATE TABLE public.user_generated_cvs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  template_id uuid REFERENCES public.cv_templates(id),
  name text NOT NULL DEFAULT 'Mon CV',
  cv_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  generated_html text,
  job_description text,
  ats_score numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_generated_cvs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own generated CVs"
  ON public.user_generated_cvs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own generated CVs"
  ON public.user_generated_cvs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own generated CVs"
  ON public.user_generated_cvs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own generated CVs"
  ON public.user_generated_cvs FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_user_generated_cvs_updated_at
  BEFORE UPDATE ON public.user_generated_cvs
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
