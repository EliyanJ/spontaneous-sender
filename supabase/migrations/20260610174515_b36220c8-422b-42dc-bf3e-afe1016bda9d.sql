
-- Restrict AI generation config reads to admins only
DROP POLICY IF EXISTS "Authenticated users can read ai_generation_config" ON public.ai_generation_config;
CREATE POLICY "Admins can read ai_generation_config"
ON public.ai_generation_config FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Restrict chatbot config reads to admins only (edge functions use service_role)
DROP POLICY IF EXISTS "Authenticated users can read chatbot config" ON public.chatbot_config;
CREATE POLICY "Admins can read chatbot config"
ON public.chatbot_config FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Restrict cv_templates SELECT from public to authenticated
DROP POLICY IF EXISTS "Authenticated users can read active templates" ON public.cv_templates;
CREATE POLICY "Authenticated users can read active templates"
ON public.cv_templates FOR SELECT
TO authenticated
USING (is_active = true OR public.has_role(auth.uid(), 'admin'::app_role));

-- Remove sensitive tables from realtime publication to prevent cross-user channel subscriptions
ALTER PUBLICATION supabase_realtime DROP TABLE public.job_queue;
ALTER PUBLICATION supabase_realtime DROP TABLE public.subscriptions;
