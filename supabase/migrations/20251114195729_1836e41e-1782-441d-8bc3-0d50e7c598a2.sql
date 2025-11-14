-- Créer les tables pour les nouvelles fonctionnalités

-- Table pour les emails programmés (via brouillons Gmail)
CREATE TABLE IF NOT EXISTS public.scheduled_emails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gmail_draft_id TEXT NOT NULL,
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  recipients TEXT[] NOT NULL,
  subject TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  notify_on_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table pour les campagnes d'emails (tracking complet)
CREATE TABLE IF NOT EXISTS public.email_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient TEXT NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  attachments JSONB,
  
  -- Envoi
  status TEXT DEFAULT 'sent' CHECK (status IN ('draft', 'scheduled', 'sent', 'failed')),
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Relances
  follow_up_enabled BOOLEAN DEFAULT true,
  follow_up_delay_days INTEGER DEFAULT 10,
  follow_up_status TEXT DEFAULT 'pending' CHECK (follow_up_status IN ('pending', 'sent', 'cancelled', 'responded')),
  follow_up_sent_at TIMESTAMP WITH TIME ZONE,
  
  -- Réponses
  response_detected_at TIMESTAMP WITH TIME ZONE,
  response_category TEXT CHECK (response_category IN ('positive', 'negative', 'neutral', 'request_info')),
  pipeline_stage TEXT CHECK (pipeline_stage IN ('interested', 'not_interested', 'meeting_scheduled', 'pending_info', 'hired', 'rejected')),
  response_summary TEXT,
  next_action TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table pour les réponses détaillées
CREATE TABLE IF NOT EXISTS public.email_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.email_campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gmail_message_id TEXT UNIQUE,
  thread_id TEXT,
  
  received_at TIMESTAMP WITH TIME ZONE NOT NULL,
  subject TEXT,
  body TEXT,
  html_body TEXT,
  
  -- AI Analysis
  category TEXT,
  pipeline_stage TEXT,
  sentiment_score FLOAT,
  summary TEXT,
  next_action TEXT,
  ai_confidence FLOAT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table pour les notifications
CREATE TABLE IF NOT EXISTS public.user_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('follow_up_reminder', 'response_detected', 'email_sent', 'email_failed')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  related_campaign_id UUID REFERENCES public.email_campaigns(id) ON DELETE SET NULL,
  
  status TEXT DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'dismissed')),
  read_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table pour la configuration du watch Gmail
CREATE TABLE IF NOT EXISTS public.gmail_watch_config (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  history_id TEXT,
  email_address TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  last_check_at TIMESTAMP WITH TIME ZONE,
  
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table pour les préférences utilisateur
CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Relances
  auto_follow_up BOOLEAN DEFAULT false,
  follow_up_delay_days INTEGER DEFAULT 10,
  follow_up_template TEXT,
  
  -- Notifications
  notify_on_response BOOLEAN DEFAULT true,
  notify_on_follow_up_reminder BOOLEAN DEFAULT true,
  notify_on_email_sent BOOLEAN DEFAULT false,
  notification_email TEXT,
  
  -- Watch
  gmail_watch_enabled BOOLEAN DEFAULT true,
  watch_check_frequency TEXT DEFAULT 'hourly' CHECK (watch_check_frequency IN ('realtime', 'hourly', 'daily')),
  
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Activer RLS sur toutes les tables
ALTER TABLE public.scheduled_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gmail_watch_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Policies pour scheduled_emails
CREATE POLICY "Users can view own scheduled emails"
  ON public.scheduled_emails FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own scheduled emails"
  ON public.scheduled_emails FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own scheduled emails"
  ON public.scheduled_emails FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own scheduled emails"
  ON public.scheduled_emails FOR DELETE
  USING (auth.uid() = user_id);

-- Policies pour email_campaigns
CREATE POLICY "Users can view own campaigns"
  ON public.email_campaigns FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own campaigns"
  ON public.email_campaigns FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own campaigns"
  ON public.email_campaigns FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own campaigns"
  ON public.email_campaigns FOR DELETE
  USING (auth.uid() = user_id);

-- Policies pour email_responses
CREATE POLICY "Users can view own responses"
  ON public.email_responses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own responses"
  ON public.email_responses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policies pour user_notifications
CREATE POLICY "Users can view own notifications"
  ON public.user_notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.user_notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications"
  ON public.user_notifications FOR DELETE
  USING (auth.uid() = user_id);

-- Policies pour gmail_watch_config
CREATE POLICY "Users can view own watch config"
  ON public.gmail_watch_config FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own watch config"
  ON public.gmail_watch_config FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own watch config"
  ON public.gmail_watch_config FOR UPDATE
  USING (auth.uid() = user_id);

-- Policies pour user_preferences
CREATE POLICY "Users can view own preferences"
  ON public.user_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON public.user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON public.user_preferences FOR UPDATE
  USING (auth.uid() = user_id);

-- Triggers pour updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_scheduled_emails_updated_at
  BEFORE UPDATE ON public.scheduled_emails
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_email_campaigns_updated_at
  BEFORE UPDATE ON public.email_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_gmail_watch_config_updated_at
  BEFORE UPDATE ON public.gmail_watch_config
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_scheduled_emails_user_status 
  ON public.scheduled_emails(user_id, status);

CREATE INDEX IF NOT EXISTS idx_scheduled_emails_scheduled_for 
  ON public.scheduled_emails(scheduled_for) 
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_email_campaigns_user_follow_up 
  ON public.email_campaigns(user_id, follow_up_status) 
  WHERE follow_up_enabled = true;

CREATE INDEX IF NOT EXISTS idx_email_campaigns_sent_at 
  ON public.email_campaigns(sent_at);

CREATE INDEX IF NOT EXISTS idx_email_responses_campaign 
  ON public.email_responses(campaign_id);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_status 
  ON public.user_notifications(user_id, status);

-- Fonction pour créer les préférences par défaut lors de la création d'un utilisateur
CREATE OR REPLACE FUNCTION public.handle_new_user_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_preferences (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER create_user_preferences
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_preferences();