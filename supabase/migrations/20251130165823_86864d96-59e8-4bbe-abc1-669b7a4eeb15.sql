-- Add DELETE policy for gmail_tokens so users can reconnect Gmail
CREATE POLICY "Users can delete their own gmail tokens"
ON public.gmail_tokens
FOR DELETE
USING (auth.uid() = user_id);