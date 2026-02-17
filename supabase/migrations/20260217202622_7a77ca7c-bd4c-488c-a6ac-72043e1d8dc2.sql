
-- Add onboarding columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS objective text,
  ADD COLUMN IF NOT EXISTS target_sectors jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS target_jobs text,
  ADD COLUMN IF NOT EXISTS professional_interests jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS cv_file_url text,
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;

-- Create private bucket for user CVs
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-cvs', 'user-cvs', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for user-cvs bucket
CREATE POLICY "Users can upload own CV"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'user-cvs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own CV"
ON storage.objects FOR SELECT
USING (bucket_id = 'user-cvs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own CV"
ON storage.objects FOR DELETE
USING (bucket_id = 'user-cvs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own CV"
ON storage.objects FOR UPDATE
USING (bucket_id = 'user-cvs' AND auth.uid()::text = (storage.foldername(name))[1]);
