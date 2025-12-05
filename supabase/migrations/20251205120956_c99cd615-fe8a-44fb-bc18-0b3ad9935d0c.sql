-- Activer l'extension pg_net pour les appels HTTP depuis les cron jobs
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;