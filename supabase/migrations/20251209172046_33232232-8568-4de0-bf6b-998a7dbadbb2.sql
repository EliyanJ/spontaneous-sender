-- Table pour les profils CV multiples
CREATE TABLE public.user_cv_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table pour les templates email multiples  
CREATE TABLE public.user_email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_cv_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_email_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for CV profiles
CREATE POLICY "Users can view own cv profiles" ON public.user_cv_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cv profiles" ON public.user_cv_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cv profiles" ON public.user_cv_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own cv profiles" ON public.user_cv_profiles
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for email templates
CREATE POLICY "Users can view own email templates" ON public.user_email_templates
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own email templates" ON public.user_email_templates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own email templates" ON public.user_email_templates
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own email templates" ON public.user_email_templates
  FOR DELETE USING (auth.uid() = user_id);

-- Triggers for updated_at
CREATE TRIGGER update_user_cv_profiles_updated_at
  BEFORE UPDATE ON public.user_cv_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_user_email_templates_updated_at
  BEFORE UPDATE ON public.user_email_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();