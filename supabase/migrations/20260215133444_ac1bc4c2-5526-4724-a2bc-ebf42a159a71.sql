
-- Step 2: Recreate profiles_safe view with gender
DROP VIEW IF EXISTS public.profiles_safe;

CREATE VIEW public.profiles_safe AS
SELECT 
  id,
  created_at,
  updated_at,
  terms_accepted_at,
  first_name,
  last_name,
  full_name,
  education_level,
  gender
FROM public.profiles;
