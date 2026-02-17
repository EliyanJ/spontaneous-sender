ALTER TABLE public.email_campaigns 
ADD COLUMN subject_type text DEFAULT null,
ADD COLUMN tone text DEFAULT null,
ADD COLUMN user_feedback text DEFAULT null,
ADD COLUMN feedback_notes text DEFAULT null;