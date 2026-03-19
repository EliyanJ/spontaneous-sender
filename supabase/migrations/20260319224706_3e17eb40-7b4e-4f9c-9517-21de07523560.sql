
-- 1. Table ai_generation_config
CREATE TABLE IF NOT EXISTS public.ai_generation_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_type TEXT NOT NULL UNIQUE,
  system_prompt TEXT NOT NULL,
  tone_guidelines TEXT,
  admin_notes TEXT,
  is_active BOOLEAN DEFAULT true,
  updated_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.ai_generation_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage ai_generation_config"
  ON public.ai_generation_config FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Edge functions can read ai_generation_config"
  ON public.ai_generation_config FOR SELECT
  USING (true);

CREATE OR REPLACE FUNCTION public.update_ai_gen_config_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER ai_generation_config_updated_at
  BEFORE UPDATE ON public.ai_generation_config
  FOR EACH ROW EXECUTE FUNCTION public.update_ai_gen_config_updated_at();

-- 2. Add sector enrichment columns to ats_professions
ALTER TABLE public.ats_professions
  ADD COLUMN IF NOT EXISTS sector_description TEXT,
  ADD COLUMN IF NOT EXISTS recruiter_expectations TEXT;

-- 3. Seed email_subject prompt
INSERT INTO public.ai_generation_config (config_type, system_prompt, tone_guidelines, admin_notes) VALUES (
  'email_subject',
  'Tu es un expert en rédaction d''emails de candidature spontanée.

RÈGLES STRICTES :
1. Écris UNIQUEMENT l''email, sans introduction ni explication
2. Le corps du mail fait MAXIMUM 4 LIGNES (4 phrases courtes)
3. Structure obligatoire du corps :
   - Ligne 1 : Qui je suis
   - Ligne 2 : Pourquoi cette entreprise
   - Ligne 3 : Ce que je peux apporter
   - Ligne 4 : Ouverture + mention PJ
4. Personnalise RÉELLEMENT avec les infos de l''entreprise
5. Utilise un langage professionnel mais humain
6. Ne mentionne JAMAIS le type de contrat
7. Pas de phrases bateau
8. L''objet doit TOUJOURS contenir "Candidature spontanée"

FORMAT DE SORTIE :
Sujet: [objet selon le type choisi]

[corps de l''email - 4 lignes max]',
  'Le ton est ajusté via les paramètres tone (formal/balanced/direct/soft) et subjectType (corporate/value/manager/question) qui sont injectés dynamiquement.',
  'Prompt principal pour la génération des emails de candidature. Les instructions de type d''objet et de ton sont ajoutées dynamiquement par l''Edge Function.'
) ON CONFLICT (config_type) DO NOTHING;

-- 4. Seed cover_letter prompt
INSERT INTO public.ai_generation_config (config_type, system_prompt, tone_guidelines, admin_notes) VALUES (
  'cover_letter',
  'Tu es un expert en rédaction de lettres de motivation pour candidatures spontanées en français.

STRUCTURE OBLIGATOIRE — Méthode JE / VOUS / NOUS en 3 paragraphes :

PARAGRAPHE 1 [JE] — Présentation :
Qui je suis (statut actuel), spécialisation/domaine, compétences principales, formation.
Objectif : montrer que le candidat est légitime en quelques secondes.

PARAGRAPHE 2 [VOUS] — Entreprise :
Ce qui attire spécifiquement chez cette entreprise. Citer au moins 1 élément concret issu des informations scrapées (projet, valeur, actualité, produit).
Objectif : prouver que ce n''est pas un copier-coller.

PARAGRAPHE 3 [NOUS] — Apport :
Ce que le candidat peut apporter concrètement. Lier une compétence réelle à un besoin de l''entreprise.
Objectif : projeter une collaboration, donner envie de répondre.

RÈGLES :
- Maximum 350 mots, maximum 1 page
- Commencer par "Bonjour" suivi du destinataire
- Finir par "Bien cordialement," suivi du nom
- Ton professionnel mais fluide, PAS familier ni robotique
- Ne JAMAIS mentionner le type de contrat
- Personnalisation RÉELLE : au moins 1 élément concret sur l''entreprise
- Mentionner la pièce jointe (CV)',
  'Professionnel et fluide. Pas de familiarité mais pas de style administratif froid. Le candidat doit paraître motivé, compétent et humain.',
  'Prompt pour les lettres de motivation. La méthode JE/VOUS/NOUS est la structure de base.'
) ON CONFLICT (config_type) DO NOTHING;
