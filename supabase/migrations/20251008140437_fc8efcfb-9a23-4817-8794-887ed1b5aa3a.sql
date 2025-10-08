-- Table des profils utilisateurs
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  linkedin_url TEXT,
  education TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des entreprises sauvegardées
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  siren TEXT NOT NULL,
  siret TEXT NOT NULL,
  nom TEXT NOT NULL,
  adresse TEXT,
  code_postal TEXT,
  ville TEXT,
  code_ape TEXT,
  libelle_ape TEXT,
  nature_juridique TEXT,
  tranche_effectif TEXT,
  website_url TEXT,
  emails JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, siren)
);

-- Table de la blacklist (entreprises déjà contactées)
CREATE TABLE public.user_company_blacklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company_siren TEXT NOT NULL,
  contacted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, company_siren)
);

-- Table des campagnes d'envoi
CREATE TABLE public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_template TEXT NOT NULL,
  cv_url TEXT,
  emails_per_day INTEGER DEFAULT 40,
  delay_between_emails INTEGER DEFAULT 45,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'paused', 'completed')),
  total_emails INTEGER DEFAULT 0,
  sent_emails INTEGER DEFAULT 0,
  failed_emails INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des envois d'emails
CREATE TABLE public.email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  recipient_email TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activer RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_company_blacklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Politiques RLS pour companies
CREATE POLICY "Users can view own companies" ON public.companies FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own companies" ON public.companies FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own companies" ON public.companies FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own companies" ON public.companies FOR DELETE USING (auth.uid() = user_id);

-- Politiques RLS pour blacklist
CREATE POLICY "Users can view own blacklist" ON public.user_company_blacklist FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own blacklist" ON public.user_company_blacklist FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Politiques RLS pour campaigns
CREATE POLICY "Users can view own campaigns" ON public.campaigns FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own campaigns" ON public.campaigns FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own campaigns" ON public.campaigns FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own campaigns" ON public.campaigns FOR DELETE USING (auth.uid() = user_id);

-- Politiques RLS pour email_logs
CREATE POLICY "Users can view own email logs" ON public.email_logs FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.campaigns 
    WHERE campaigns.id = email_logs.campaign_id 
    AND campaigns.user_id = auth.uid()
  )
);

-- Trigger pour créer le profil automatiquement
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Index pour performances
CREATE INDEX idx_companies_user_id ON public.companies(user_id);
CREATE INDEX idx_companies_siren ON public.companies(siren);
CREATE INDEX idx_blacklist_user_id ON public.user_company_blacklist(user_id);
CREATE INDEX idx_blacklist_siren ON public.user_company_blacklist(company_siren);
CREATE INDEX idx_campaigns_user_id ON public.campaigns(user_id);
CREATE INDEX idx_email_logs_campaign_id ON public.email_logs(campaign_id);
CREATE INDEX idx_email_logs_status ON public.email_logs(status);