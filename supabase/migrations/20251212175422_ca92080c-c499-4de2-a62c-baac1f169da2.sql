-- Ajouter la colonne attachments à la table scheduled_emails
ALTER TABLE scheduled_emails ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;