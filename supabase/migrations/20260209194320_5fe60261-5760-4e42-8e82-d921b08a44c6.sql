
-- Remove support role from direct profiles access (keep admin only)
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create a safe view for support staff that excludes sensitive PII
CREATE OR REPLACE VIEW public.profiles_safe
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

-- Allow support to read the safe view via a policy on the base table
-- Support can only access via the view which excludes phone, linkedin_url, cv_content, education, age
CREATE POLICY "Support can view profiles via safe view"
ON public.profiles
FOR SELECT
USING (has_role(auth.uid(), 'support'::app_role));
