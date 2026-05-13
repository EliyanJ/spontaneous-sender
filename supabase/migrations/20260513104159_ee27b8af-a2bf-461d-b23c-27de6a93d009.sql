
-- 1) chatbot_config: restrict SELECT to authenticated users
DROP POLICY IF EXISTS "Anyone can read chatbot config" ON public.chatbot_config;
CREATE POLICY "Authenticated users can read chatbot config"
ON public.chatbot_config
FOR SELECT
TO authenticated
USING (true);

-- 2) cv_sector_phrases: restrict SELECT to authenticated only
DROP POLICY IF EXISTS "Authenticated users can read sector phrases" ON public.cv_sector_phrases;
CREATE POLICY "Authenticated users can read sector phrases"
ON public.cv_sector_phrases
FOR SELECT
TO authenticated
USING (true);

-- 3) Harden has_role: prevent authenticated users from probing other users' roles.
-- When called from RLS policies (with auth.uid()) or from service_role/edge functions
-- (auth.uid() IS NULL), behavior is unchanged. Only direct RPC probes against other
-- user IDs by non-admins are blocked.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NOT NULL
     AND _user_id IS DISTINCT FROM auth.uid()
     AND NOT EXISTS (
       SELECT 1 FROM public.user_roles
       WHERE user_id = auth.uid() AND role = 'admin'::app_role
     )
  THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
END;
$function$;
