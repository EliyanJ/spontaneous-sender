
-- Create chatbot_config table (single-row config)
CREATE TABLE public.chatbot_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  system_prompt text NOT NULL,
  knowledge_base text DEFAULT '',
  model text DEFAULT 'google/gemini-2.5-flash',
  is_active boolean DEFAULT true,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid
);

-- Enable RLS
ALTER TABLE public.chatbot_config ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage chatbot config"
ON public.chatbot_config
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Public read so edge function (anon key) can read config
CREATE POLICY "Anyone can read chatbot config"
ON public.chatbot_config
FOR SELECT
USING (true);
