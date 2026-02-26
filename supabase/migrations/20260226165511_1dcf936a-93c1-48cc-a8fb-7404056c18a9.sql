
CREATE TABLE public.cookie_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  session_fingerprint text,
  analytics_accepted boolean NOT NULL DEFAULT false,
  preferences_accepted boolean NOT NULL DEFAULT false,
  consented_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cookie_consents ENABLE ROW LEVEL SECURITY;

-- Anyone (including anonymous) can insert a consent record
CREATE POLICY "Anyone can insert cookie consent"
  ON public.cookie_consents
  FOR INSERT
  WITH CHECK (true);

-- Users can update their own consent
CREATE POLICY "Users can update own cookie consent"
  ON public.cookie_consents
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can view their own consent
CREATE POLICY "Users can view own cookie consent"
  ON public.cookie_consents
  FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

-- Admins can view all consents
CREATE POLICY "Admins can view all cookie consents"
  ON public.cookie_consents
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_cookie_consents_updated_at
  BEFORE UPDATE ON public.cookie_consents
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
