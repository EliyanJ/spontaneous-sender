-- Add generic_email_template column to subscriptions table
-- This stores the default email template for users on basic plans

ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS generic_email_template JSONB DEFAULT NULL;