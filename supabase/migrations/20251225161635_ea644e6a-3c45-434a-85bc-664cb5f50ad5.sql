-- Allow service role or trigger to insert subscriptions
CREATE POLICY "Allow insert for trigger" ON public.subscriptions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Also allow users to insert their own subscription (for edge cases)
CREATE POLICY "Users can insert own subscription" ON public.subscriptions
FOR INSERT
WITH CHECK (auth.uid() = user_id);