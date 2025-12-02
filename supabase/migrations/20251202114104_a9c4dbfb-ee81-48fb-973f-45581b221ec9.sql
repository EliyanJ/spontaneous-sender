-- Ajouter les colonnes pour sites carrières et formulaires de contact
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS career_site_url TEXT,
ADD COLUMN IF NOT EXISTS has_contact_form BOOLEAN DEFAULT false;

-- Créer un index pour les recherches
CREATE INDEX IF NOT EXISTS idx_companies_career_site ON public.companies(career_site_url) WHERE career_site_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_companies_contact_form ON public.companies(has_contact_form) WHERE has_contact_form = true;

-- Nettoyer les emails de test (> 14 jours)
DELETE FROM public.email_campaigns 
WHERE sent_at IS NOT NULL 
  AND sent_at < NOW() - INTERVAL '14 days';

-- Créer un cron job pour traiter les emails programmés toutes les minutes
SELECT cron.schedule(
  'process-scheduled-emails-every-minute',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://fxnnnhmhshmhcttmucwf.supabase.co/functions/v1/process-scheduled-emails',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4bm5uaG1oc2htaGN0dG11Y3dmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5MTcwODcsImV4cCI6MjA3NTQ5MzA4N30.5Ci3etIvb_CtLnyAN9VqzMjSl_-4SpZg8q7pNvhn8ho"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);