# Architecture Technique — Spontaneous Sender

> Document généré le 19 mars 2026 — Audit complet de la codebase

---

## Bloc 1 — Architecture technique

### 1. Stack technique complète

| Couche | Technologie | Version |
|--------|------------|---------|
| **Frontend** | React + TypeScript | 18.3.1 / 5.8.3 |
| **Build** | Vite | 5.4.19 |
| **CSS** | Tailwind CSS + shadcn/ui (Radix UI) | 3.4.17 |
| **State Management** | React Query (@tanstack/react-query) | 5.83.0 |
| **Routing** | React Router DOM | 6.30.1 |
| **Formulaires** | React Hook Form + Zod | 7.61.1 / 3.25.76 |
| **Backend** | Supabase (PostgreSQL) + 42 Edge Functions (Deno) | — |
| **Auth** | Supabase Auth + Google OAuth (via Lovable Cloud Auth) | — |
| **Hébergement** | Lovable.dev (auto-deploy on push) | — |

### 2. Supabase — Tables et Edge Functions

**Oui, Supabase est pleinement intégré.** Projet ID : `fxnnnhmhshmhcttmucwf`

#### Tables principales (40+)

| Table | Rôle |
|-------|------|
| `profiles` | Profils utilisateurs (nom, CV, secteurs cibles, objectifs) |
| `subscriptions` | Plans (free/simple/plus), limites d'envoi, tokens, IDs Stripe |
| `companies` | CRM entreprises (SIREN, SIRET, emails, site, pipeline stage) |
| `email_campaigns` | Emails envoyés (sujet, corps, statut, réponses) |
| `email_responses` | Emails entrants + analyse IA |
| `email_templates` / `user_email_templates` | Templates génériques + personnalisés |
| `cv_analyses` | Historique des scores ATS |
| `ats_professions` | Référentiel métiers (keywords primaires/secondaires, soft skills) |
| `job_queue` | File d'attente async pour recherches entreprises |
| `gmail_tokens` | Tokens OAuth chiffrés (AES-256-GCM) |
| `scheduled_emails` | Emails programmés via brouillons Gmail |
| `user_roles` | Rôles admin/support/analyste |
| `user_activity_logs` | Suivi comportemental |
| `user_preferences` | Paramètres (relances, Gmail watch, notifications) |
| `chatbot_config` | Config chatbot (system prompt, knowledge base, modèle) |
| `cms_pages` / `cms_blocks` | Gestion de contenu dynamique |
| `seo_settings` | Meta tags par route |
| `ats_keyword_feedback` | Feedback utilisateurs sur l'analyse ATS |
| `job_title_clusters` | Auto-clustering pour suggestion de métiers |
| `referrals`, `token_transactions`, `support_tickets`, `blacklists` | Parrainage, tokens, support, blacklist |

#### Edge Functions (42 fonctions)

**IA & Génération :**
- `generate-personalized-emails` — Emails personnalisés par entreprise (scrape site + Gemini)
- `generate-cover-letter` — Lettres de motivation (3 paragraphes)
- `generate-cv-content` — Parse CV, structure JSON, optimise par secteur
- `analyze-cv-ats` — Score ATS détaillé (7 critères, 0-100)
- `ats-ai-review` — Analyse keywords manquants
- `ai-sector-guide` — Langage naturel → codes APE
- `chatbot-assistant` — Chat streaming avec knowledge base
- `ai-template-designer` / `ai-template-from-pdf` — Templates via IA

**Recherche & Données entreprises :**
- `search-companies` — Proxy API INSEE/Sirene
- `find-company-emails` — Scraping web pour emails
- `scrape-websites` — Extraction contenu sites
- `parse-cv-document` — Extraction texte PDF

**Gmail :**
- `send-gmail-emails`, `schedule-gmail-draft`, `sync-gmail-history`
- `check-email-responses`, `check-email-bounces`
- `store-gmail-tokens`, `refresh-gmail-token`, `migrate-encrypt-tokens`

**Jobs async & Crons :**
- `job-worker` — Processeur de file d'attente
- `process-scheduled-emails` — Envoi programmé
- `process-follow-ups` — Relances automatiques
- `check-follow-up-reminders`, `check-campaign-reminders`

**Paiement :**
- `create-checkout`, `stripe-webhook`, `check-subscription`, `customer-portal`, `admin-manage-promos`

**Admin :**
- `admin-delete-user`, `admin-reset-user-data`, `admin-get-users`
- `custom-reset-password`, `send-system-email`

**Utilitaire :**
- `france-travail` — Proxy API offres d'emploi
- `html-to-canvas-template` — Rendu HTML → canvas
- `_shared/crypto.ts` — Chiffrement AES-256-GCM partagé

### 3. API externes intégrées

| API | Usage | Détails |
|-----|-------|---------|
| **Gemini (via Lovable gateway)** | IA principale | Endpoint : `https://ai.gateway.lovable.dev/v1/chat/completions` — Bearer token `LOVABLE_API_KEY` |
| **Stripe** | Paiements | 4 produits (2 plans + 2 packs tokens) — Webhooks actifs |
| **Gmail OAuth** | Envoi/réception emails | Scopes: gmail.send, gmail.readonly, gmail.modify |
| **INSEE/Sirene** | Recherche entreprises | Via Edge Function `search-companies` |
| **France Travail** | Offres d'emploi | OAuth2 client_credentials — Utilisateurs premium uniquement |

---

## Bloc 2 — Données existantes

### 1. Stockage des données utilisateurs

| Type de données | Stockage | Chiffré ? |
|----------------|----------|-----------|
| Credentials | Supabase Auth | ✓ (natif Supabase) |
| Profil (nom, téléphone, LinkedIn) | `profiles` | ✗ |
| Contenu CV | `profiles.cv_content` | ✗ |
| Entreprises | `companies` | ✗ |
| Templates email | `email_templates` + `user_email_templates` | ✗ |
| Profils CV sauvegardés | `user_cv_profiles` | ✗ |
| Tokens Gmail OAuth | `gmail_tokens` | ✓ AES-256-GCM |
| Historique emails | `email_campaigns` | ✗ |
| Réponses emails | `email_responses` | ✗ |
| Analyses CV (scores ATS) | `cv_analyses` | ✗ |
| Préférences | `user_preferences` | ✗ |
| Abonnement/plan | `subscriptions` | ✗ |
| Logs activité | `user_activity_logs` | ✗ |

**Stockage navigateur (localStorage) :**
- Session Supabase Auth
- Favoris offres d'emploi (JSON)
- Préférence thème
- Consentement cookies

### 2. Base de documents / contenus textuels pour l'IA

**Oui, deux sources :**

1. **Knowledge Base chatbot** — Champ texte dans `chatbot_config.knowledge_base`, éditable par admin dans `/admin/chatbot`. Contient FAQ, instructions, contexte métier.
2. **Base métiers ATS** — Table `ats_professions` avec :
   - Intitulés de poste + alias
   - Keywords primaires et secondaires
   - Soft skills
   - Mots exclus
   - Hiérarchie par thèmes parents

### 3. Volume de données générées

Les données sont générées dans :
- **`email_campaigns`** — Chaque email envoyé (sujet, corps, statut, réponse)
- **`email_responses`** — Chaque réponse reçue + catégorisation IA
- **`cv_analyses`** — Chaque analyse ATS (7 critères scorés)
- **`companies`** — Chaque entreprise trouvée + insights scrapés
- **`user_activity_logs`** — Chaque action utilisateur
- **`ats_keyword_feedback`** — Feedback sur les suggestions ATS
- **`token_transactions`** — Historique consommation tokens

> Le volume exact dépend du nombre d'utilisateurs actifs. Les plans limitent les envois : 5/mois (gratuit), 100/mois (standard), 400/mois (premium).

---

## Bloc 3 — IA actuelle

### 1. Usages de l'IA dans l'app

| Cas d'usage | Type |
|-------------|------|
| Génération d'emails personnalisés | Génération de contenu |
| Lettres de motivation | Génération de contenu |
| Optimisation de CV | Génération de contenu |
| Analyse ATS (score + keywords) | Analyse / scoring |
| Chatbot assistant | Chatbot conversationnel |
| Catégorisation des réponses email | Classification |
| Suggestion de métiers | Recommandation |
| Guide sectoriel (texte → codes APE) | Conversion NLP |
| Design de templates email via IA | Génération de contenu |

### 2. API, modèle et gestion des prompts

**API appelée :** Gemini via le gateway Lovable
- Endpoint : `https://ai.gateway.lovable.dev/v1/chat/completions`
- Auth : Bearer token (`LOVABLE_API_KEY`)

**Modèle par défaut :** `google/gemini-2.5-flash`

**Modèles alternatifs (configurables par admin dans `/admin/chatbot`) :**
- `google/gemini-2.5-flash-lite` (économique)
- `google/gemini-2.5-pro` (précision)
- `google/gemini-3-flash-preview` (next-gen)

**Gestion des prompts :**

| Source | Exemples |
|--------|----------|
| **En dur dans les Edge Functions** | `generate-personalized-emails` (prompts sujet + ton), `generate-cover-letter` (structure lettre), `generate-cv-content` (parsing CV), `analyze-cv-ats` (matching keywords) |
| **Dynamiques depuis la BDD** | `chatbot_config.system_prompt` (éditable admin), `chatbot_config.knowledge_base` (FAQ/articles admin) |
| **Hybrides** | L'email generation injecte dynamiquement les données entreprise (scraping) + profil utilisateur dans un prompt hardcodé |

### 3. Stockage des réponses IA

| Réponse IA | Stockée ? | Où ? |
|-----------|-----------|------|
| Sujets + corps d'emails | ✓ | `email_campaigns` |
| Insights entreprise (scraping) | ✓ | `companies.company_insights` |
| Scores ATS + détails | ✓ | `cv_analyses` |
| Catégorisation réponses | ✓ | `email_campaigns` + `email_responses` |
| Suggestions métiers | ✓ | `ats_professions` (marquées `pending_review`) |
| Conversations chatbot | ✗ | Streaming SSE uniquement, non persisté |
| Lettres de motivation | ✗ | Retournées à l'utilisateur, non sauvegardées |
| Parsing CV | ✗ | JSON retourné, non stocké tel quel |

---

## Bloc 4 — Capacités de Lovable

### 1. Packages npm personnalisés

**Oui.** Le `package.json` contient déjà 50+ dépendances incluant des librairies spécialisées (jspdf, docx, html2canvas, recharts, react-markdown, etc.). Il est possible d'ajouter des packages comme `langchain`, `@google/generative-ai`, ou des libs de vector search.

> **Note :** L'exécution côté client est limitée au navigateur. Pour des opérations lourdes (embeddings, vector search), il faut passer par des Edge Functions Deno.

### 2. Edge Functions Supabase depuis Lovable

**Oui, c'est déjà le cas.** Le projet contient 42 Edge Functions déployées et fonctionnelles dans `/supabase/functions/`. Le déploiement se fait via Lovable lors du push.

### 3. pgvector

**Non activé actuellement.** Aucune trace de :
- Extension `vector` dans les migrations
- Types de données `vector` dans les tables
- Imports ou requêtes de similarité vectorielle

> **Activable ?** pgvector est disponible nativement sur Supabase (c'est une extension PostgreSQL). Il suffit d'exécuter `CREATE EXTENSION IF NOT EXISTS vector;` dans une migration, puis de créer des colonnes de type `vector(dimension)`.

---

## Bloc 5 — Objectifs fonctionnels

### 1. Cas d'usage principal pour améliorer l'IA

D'après l'architecture actuelle, les axes d'amélioration les plus impactants sont :

1. **Personnalisation des emails** — L'IA génère des emails basés sur le scraping du site + profil utilisateur, mais sans mémoire des interactions passées ni apprentissage des réponses reçues.
2. **Pertinence du chatbot** — Le chatbot utilise une knowledge base statique (texte admin). Pas de RAG, pas de recherche sémantique, pas d'indexation des contenus existants.
3. **Analyse ATS** — Le matching de keywords est en partie rule-based (correspondance exacte sur `ats_professions`). L'IA intervient en complément mais pas en première ligne.

### 2. Points de friction identifiables (architecture)

Basé sur l'analyse du code :

- **Chatbot sans contexte** : le chatbot ne consulte que `chatbot_config.knowledge_base` (texte statique). Il ne sait rien des fonctionnalités, de l'historique utilisateur, ni des données en base.
- **Pas de RAG** : aucune recherche vectorielle → les réponses reposent entièrement sur le prompt + knowledge base textuelle.
- **Pas de mémoire conversationnelle persistante** : les conversations chatbot sont en streaming SSE et non stockées.
- **Prompts hardcodés** : la majorité des prompts sont dans le code des Edge Functions, rendant l'itération difficile sans redéploiement.
- **Pas de feedback loop** : les réponses catégorisées (positif/négatif/neutre) ne sont pas réinjectées pour améliorer les futurs emails.

---

## Recommandations techniques (pour amélioration IA)

| Amélioration | Effort | Impact |
|-------------|--------|--------|
| Activer pgvector + créer des embeddings sur la knowledge base | Moyen | Haut — Permet le RAG pour le chatbot |
| Stocker les conversations chatbot | Faible | Moyen — Permet l'analyse et l'amélioration |
| Externaliser les prompts en BDD | Moyen | Haut — Itération rapide sans redéploiement |
| Feedback loop sur les réponses emails | Moyen | Haut — Emails plus pertinents au fil du temps |
| Ajouter le contexte utilisateur au chatbot | Faible | Haut — Réponses personnalisées |

---

## Arborescence clé

```
/src/
├── pages/              # Composants de pages
├── components/         # Composants React (UI, dashboard)
├── integrations/
│   ├── supabase/client.ts    # Init client Supabase
│   ├── supabase/types.ts     # Types DB auto-générés
│   └── lovable/index.ts      # Helpers OAuth
├── lib/
│   ├── stripe-config.ts      # IDs produits + feature flags
│   ├── plan-features.ts      # Validation par plan
│   └── cv-templates.ts       # Définitions templates
└── hooks/                    # Custom React hooks

/supabase/
├── functions/          # 42 Edge Functions (Deno)
├── migrations/         # 48 migrations SQL
└── config.toml         # Config fonctions + JWT

.env                    # Project ID + clés Supabase
vite.config.ts          # Configuration build
```
