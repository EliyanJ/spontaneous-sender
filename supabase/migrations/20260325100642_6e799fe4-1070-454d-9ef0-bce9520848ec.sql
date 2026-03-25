-- Drop the overly permissive UPDATE policy on subscriptions
-- that allowed any authenticated user to self-upgrade their plan/credits
DROP POLICY IF EXISTS "Users can update own subscription" ON public.subscriptions;