-- Create email_templates table for storing reusable email templates
CREATE TABLE public.email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for email_templates
CREATE POLICY "Users can view own templates"
  ON public.email_templates
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own templates"
  ON public.email_templates
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own templates"
  ON public.email_templates
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own templates"
  ON public.email_templates
  FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Create storage bucket for email attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('email-attachments', 'email-attachments', false, 20971520);

-- RLS Policies for email attachments storage
CREATE POLICY "Users can upload own attachments"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'email-attachments' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own attachments"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'email-attachments' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own attachments"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'email-attachments' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );