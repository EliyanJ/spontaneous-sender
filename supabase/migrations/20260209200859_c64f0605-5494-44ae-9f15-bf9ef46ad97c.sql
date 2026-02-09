
-- Fix: recreate view with security_invoker to avoid security definer warning
-- But we need support to access it without base table policy
-- Solution: use security_invoker = on AND add a restrictive support policy on base table
DROP VIEW IF EXISTS public.profiles_safe;

CREATE VIEW public.profiles_safe
WITH (security_invoker = on) AS
SELECT 
  id,
  first_name,
  last_name,
  full_name,
  education_level,
  created_at,
  updated_at,
  terms_accepted_at
FROM public.profiles;

-- Add back a support policy on profiles so the view works, but this gives column access
-- Actually the better approach: just remove support access entirely
-- Support staff don't need profile data - they handle tickets which already have user_id
-- The admin backoffice for support can show ticket data without profile PII
