-- Allow admins to view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'support'));

-- Allow admins to view all companies
CREATE POLICY "Admins can view all companies"
ON public.companies
FOR SELECT
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'support'));

-- Allow admins to view all email_campaigns
CREATE POLICY "Admins can view all email_campaigns"
ON public.email_campaigns
FOR SELECT
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'support'));

-- Allow admins to view all job_queue
CREATE POLICY "Admins can view all job_queue"
ON public.job_queue
FOR SELECT
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'support'));

-- Allow admins to view all scheduled_emails
CREATE POLICY "Admins can view all scheduled_emails"
ON public.scheduled_emails
FOR SELECT
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'support'));

-- Allow admins to view all gmail_tokens (for debugging)
CREATE POLICY "Admins can view all gmail_tokens"
ON public.gmail_tokens
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Allow admins to view all user_preferences
CREATE POLICY "Admins can view all user_preferences"
ON public.user_preferences
FOR SELECT
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'support'));