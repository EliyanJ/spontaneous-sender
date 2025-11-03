-- Add INSERT policy for email_logs table to allow campaign owners to insert logs
CREATE POLICY "Campaign owners can insert logs"
ON email_logs FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM campaigns 
    WHERE campaigns.id = email_logs.campaign_id 
    AND campaigns.user_id = auth.uid()
  )
);