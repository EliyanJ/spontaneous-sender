-- Add selected_email and status columns to companies table
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS selected_email text,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'not sent';