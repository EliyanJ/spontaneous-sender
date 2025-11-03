-- Add DELETE policy to user_company_blacklist table
CREATE POLICY "Users can delete own blacklist"
ON user_company_blacklist FOR DELETE
USING (auth.uid() = user_id);