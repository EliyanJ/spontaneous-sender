
-- Fix security definer view warning
ALTER VIEW public.profiles_safe SET (security_invoker = on);
