
-- Remove support direct access to profiles base table
DROP POLICY IF EXISTS "Support can view profiles via safe view" ON public.profiles;

-- Recreate the safe view WITHOUT security_invoker so it bypasses RLS
-- This way support can query the view (which excludes PII) without needing base table access
DROP VIEW IF EXISTS public.profiles_safe;

CREATE VIEW public.profiles_safe AS
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

-- Grant select on the safe view to authenticated users (RLS on base table still protects direct access)
GRANT SELECT ON public.profiles_safe TO authenticated;
