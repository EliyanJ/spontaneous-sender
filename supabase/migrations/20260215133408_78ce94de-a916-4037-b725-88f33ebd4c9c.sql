
-- Step 1: Add gender column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gender text;
