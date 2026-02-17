
-- Add new fields to support_tickets
ALTER TABLE public.support_tickets 
  ADD COLUMN IF NOT EXISTS category text DEFAULT 'support',
  ADD COLUMN IF NOT EXISTS urgency text DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS assigned_to uuid;
