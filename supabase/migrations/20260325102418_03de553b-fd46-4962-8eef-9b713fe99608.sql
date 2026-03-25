-- Drop the overly permissive policy that exposes AI system prompts to unauthenticated users.
-- Edge functions use the service_role key which bypasses RLS entirely, so this policy is unnecessary.
DROP POLICY IF EXISTS "Edge functions can read ai_generation_config" ON public.ai_generation_config;

-- Add a restricted policy: only authenticated users (admins) can read AI config
CREATE POLICY "Authenticated users can read ai_generation_config"
  ON public.ai_generation_config
  FOR SELECT
  TO authenticated
  USING (true);