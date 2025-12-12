-- Activer l'extension pgmq pour les queues
CREATE EXTENSION IF NOT EXISTS pgmq;

-- Créer la queue pour les emails programmés
SELECT pgmq.create('scheduled_emails_queue');

-- Ajouter une colonne pour stocker le contenu de l'email directement
ALTER TABLE public.scheduled_emails 
ADD COLUMN IF NOT EXISTS email_body TEXT,
ADD COLUMN IF NOT EXISTS queue_msg_id BIGINT;