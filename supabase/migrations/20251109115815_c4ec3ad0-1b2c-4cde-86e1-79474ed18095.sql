-- Fix security warnings: set search_path for the new trigger function
DROP FUNCTION IF EXISTS public.update_gmail_tokens_updated_at() CASCADE;

CREATE OR REPLACE FUNCTION public.update_gmail_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public;

-- Recreate the trigger
CREATE TRIGGER update_gmail_tokens_updated_at
  BEFORE UPDATE ON public.gmail_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_gmail_tokens_updated_at();