-- Create rate_limits table for tracking edge function usage
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view their own rate limits
CREATE POLICY "Users can view their own rate limits" 
ON public.rate_limits 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create index for efficient rate limit queries
CREATE INDEX idx_rate_limits_user_action_time ON public.rate_limits(user_id, action, created_at DESC);

-- Create function to clean up old rate limit records (older than 24 hours)
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.rate_limits 
  WHERE created_at < NOW() - INTERVAL '24 hours';
END;
$$;