# Cronos — Product Overview

> Référence produit complète. Utiliser comme base de contexte pour itérer avec un collègue ou une IA conversationnelle.

---

## Table des matières

1. [Vue d'ensemble produit](#1-vue-densemble-produit)
2. [Pages publiques](#2-pages-publiques)
3. [Authentification & onboarding](#3-authentification--onboarding)
4. [Dashboard utilisateur](#4-dashboard-utilisateur)
5. [Plans & feature gating](#5-plans--feature-gating)
6. [Back-office admin](#6-back-office-admin)
7. [Intégrations techniques](#7-intégrations-techniques)
8. [Modèle de données](#8-modèle-de-données)
9. [Glossaire termes métier](#9-glossaire-termes-métier)

---

## 1. Vue d'ensemble produit

**Cronos** est un outil de candidature spontanée ultra-automatisé destiné aux **étudiants et jeunes diplômés** français.

### Proposition de valeur

> Envoyer des emails de candidature personnalisés à des dizaines d'entreprises ciblées, sans effort manuel — via son propre compte Gmail.

### Parcours utilisateur type (7 étapes)

```
Inscription → Onboarding (profil + CV) → Recherche d'entreprises
→ Sélection + recherche emails → Génération email IA
→ Envoi via Gmail → Suivi réponses + relances auto
```

### Public cible
- Étudiants en école de commerce / ingénieur / université
- Jeunes diplômés cherchant stages ou CDI
- Personnes en reconversion ciblant plusieurs secteurs

---

## 2. Pages publiques

### `/` — Landing page
- Hero avec CTA "Commencer gratuitement"
- Section "Comment ça marche" (3 étapes illustrées)
- Témoignages / preuves sociales
- Section pricing résumée
- Footer avec liens légaux

### `/pricing` — Tarification
- 3 plans comparés (Gratuit / Standard / Premium)
- Packs de tokens achetables à l'unité
- FAQ sur les plans
- CTA vers inscription ou checkout Stripe

### `/score-cv` — Analyseur ATS
- Outil gratuit : uploader son CV + coller une fiche de poste
- Score /100 sur 7 critères ATS
- **1 essai sans compte**, puis popup d'inscription
- FAQ SEO optimisée pour le trafic organique

### `/cv-builder` — Créateur de CV
- 9 templates sectoriels avec filtres avec/sans photo
- Header SEO inline (logo + navigation complète + bouton connexion/dashboard)
- Flux de création en **6 étapes** (CVBuilderEditor) :
  1. Coordonnées (upload photo, nom, titre, contact)
  2. Profil (accroche personnelle)
  3. Expériences (accordéons, ajout multiple)
  4. Formation (accordéons, ajout multiple)
  5. Compétences (tags interactifs + suggestions)
  6. Finalisation (aperçu + export/sauvegarde)
- Génération du contenu par IA (descriptions de postes)
- Sauvegarde en base (`user_generated_cvs`)
- Export HTML (print-to-PDF navigateur)
- Popup d'inscription si non connecté à la sauvegarde

### `/offres-emploi` — Offres d'emploi publiques
- Offres provenant de l'API France Travail
- Filtres : secteur, type de contrat, localisation
- Pagination
- Favoris (localStorage, sans compte)
- Accessible sans authentification

### `/blog` — Blog conseils carrière
- Articles statiques (contenu éditorial)
- URL `/blog/:slug`
- Optimisés SEO (meta, og:image, canonical)

### Pages légales
- `/mentions-legales` — Mentions légales (FR)
- `/politique-confidentialite` — Politique de confidentialité (FR)
- `/conditions-utilisation` — CGU (FR)
- Versions anglaises disponibles (`-en` suffix)

---

## 3. Authentification & Onboarding

### Authentification
- Email / mot de passe (Supabase Auth)
- Confirmation email obligatoire (pas d'auto-confirm)
- Réinitialisation mot de passe par email (`/forgot-password` → `/reset-password`)
- Pages : `/login`, `/register`, `/auth` (dialog embarquée), `/forgot-password`, `/reset-password`

### Onboarding (4 étapes)
Déclenché après première connexion si `profiles.onboarding_completed = false`

| Étape | Contenu |
|-------|---------|
| 1. CV | Upload PDF ou saisie manuelle du contenu CV |
| 2. Secteurs | Sélection des secteurs d'activité cibles (multi-choix) |
| 3. Intérêts | Centres d'intérêt professionnels (soft skills, domaines) |
| 4. Objectifs | Type de poste recherché, niveau d'études, objectif |

→ Sauvegarde dans `profiles` (cv_content, target_sectors, professional_interests, target_jobs)

---

## 4. Dashboard utilisateur

Accessible sur `/` (post-connexion), layout avec sidebar desktop + nav mobile.

### 4.1 Vue d'ensemble (`overview`)

- **KPIs** : emails envoyés, entreprises trouvées, CV générés, crédits restants
- **Graphique** : performance des recherches dans le temps
- **Accès rapide** : raccourcis vers les 6 actions principales
- **Bannière upgrade** si plan Gratuit ou Standard

### 4.2 Recherche d'entreprises (`search`)

3 modes de recherche :

#### Mode IA (`AISearchMode`)
- L'utilisateur décrit son projet en langage naturel
- L'IA extrait : secteur(s), localisation, taille d'entreprise
- Génère des paramètres de recherche → envoie vers l'API

#### Mode Manuel (`ManualSearchMode`)
- Filtres : secteur d'activité (code APE), ville/département, taille d'effectif
- Sélection géographique précise à la ville (**Premium uniquement**)
- Sélection au département (**Gratuit/Standard**)

#### Mode Automatique (`AutomaticSearch`)
- Utilise les secteurs cibles du profil utilisateur
- Lance la recherche automatiquement
- Disponible sur tous les plans

**Pipeline de recherche :**
```
Paramètres → job_queue (création) → job-worker (traitement async)
→ search-companies (API Sirene/INSEE) → find-company-emails (scraping)
→ companies (sauvegarde CRM) → Résultats affichés
```

**Limites par plan :**
- Gratuit : 20 entreprises max / recherche
- Standard : 50 entreprises max / recherche
- Premium : 200 entreprises max / recherche

### 4.3 Mes entreprises (`companies`)

CRM léger pour gérer les entreprises trouvées.

**Données par entreprise :**
- Nom, SIREN/SIRET, adresse, ville
- Code APE / libellé secteur
- Emails trouvés (multiple, sélectionnable)
- URL site web
- Statut pipeline
- Notes libres
- Insights IA (résumé entreprise)

**Statuts pipeline :**
`nouveau` → `contacté` → `en_attente` → `réponse_positive` → `réponse_négative` → `entretien`

**Actions disponibles :**
- Voir détail entreprise (drawer)
- Sélectionner pour envoi d'email
- Blacklister (ne plus apparaître dans les recherches)
- Supprimer

### 4.4 Emails & Campagnes

#### Composition d'email (`EmailComposer`)
- Sélection des entreprises destinataires
- **Template générique** (tous plans) ou **génération IA** (Premium)
- Personnalisation : objet, corps, ton (formel/dynamique/créatif)
- Upload pièce jointe CV (PDF)
- Prévisualisation avant envoi

#### Envoi Gmail (`send-gmail-emails`)
- Envoi depuis le compte Gmail de l'utilisateur (OAuth connecté)
- Tracking status : envoyé / échoué / planifié
- Consomme 1 crédit d'envoi par email

#### Emails planifiés (`ScheduledEmails`)
- Programmer l'envoi à une date/heure précise
- Création d'un brouillon Gmail → envoi déclenché par cron

#### Suivi des réponses (`check-email-responses`)
- Détection automatique des réponses via Gmail API
- Catégorisation IA : positif / négatif / neutre / entretien
- Résumé de la réponse
- Mise à jour du pipeline entreprise

#### Relances automatiques (`process-follow-ups`)
- Si pas de réponse après N jours configurables
- Email de relance personnalisé (template configurable)
- Activable dans les préférences utilisateur

#### Campagnes groupées (`campaigns`)
- Regroupement d'envois par batch
- Stats globales : total envoyé, échoués, réponses
- Feedback utilisateur (👍 / 👎 par email reçu)

### 4.5 Score CV (`cv-score`)

- Upload CV (PDF) + coller une fiche de poste
- Analyse ATS via `analyze-cv-ats` edge function
- Score /100 décomposé en 7 critères :

| Critère | Description |
|---------|-------------|
| Mots-clés primaires | Termes techniques essentiels du poste |
| Mots-clés secondaires | Termes complémentaires / contextuels |
| Soft skills | Compétences comportementales détectées |
| Structure | Sections attendues présentes (expérience, formation...) |
| Coordonnées | Email, téléphone, LinkedIn détectés |
| Résultats mesurables | Chiffres, pourcentages, impacts quantifiés |
| Titre de poste | Titre en adéquation avec l'offre |

- Historique des analyses sauvegardé (`cv_analyses`)
- Comparateur entre 2 CVs (`CVComparator`)

### 4.6 Offres d'emploi

- Redirect vers `/offres-emploi` (page publique)
- Filtres : contrat, secteur, localisation
- Source : API France Travail
- **Premium uniquement**

### 4.7 Paramètres (`settings`)

| Section | Contenu |
|---------|---------|
| Profil | Nom, prénom, photo, téléphone, LinkedIn, objectif |
| Abonnement | Plan actuel, crédits restants, bouton upgrade/portail Stripe |
| Gmail | Connexion / déconnexion OAuth, statut sync |
| Notifications | Alertes email sur réponse, envoi, relance |
| Relances auto | Activer/désactiver, délai en jours, template |
| Template générique | Personnalisation du template d'email de base |

---

## 5. Plans & Feature Gating

### Tableau comparatif

| Fonctionnalité | Gratuit | Standard (14€/mois) | Premium (39€/mois) |
|---|:---:|:---:|:---:|
| Envois d'emails / mois | 5 | 100 | 400 |
| Recherche automatique | ✓ | ✓ | ✓ |
| Recherche par département | ✓ | ✓ | ✓ |
| Recherche par ville | ✗ | ✗ | ✓ |
| Recherche manuelle (filtres) | ✗ | ✗ | ✓ |
| Recherche IA (langage naturel) | ✗ | ✗ | ✓ |
| Max entreprises / recherche | 20 | 50 | 200 |
| Génération emails IA | ✗ | ✗ | ✓ |
| Génération lettres de motivation | ✗ | ✗ | ✓ |
| Objet email IA | ✗ | ✗ | ✓ |
| Accès offres d'emploi | ✗ | ✗ | ✓ |
| Score CV ATS | ✓ | ✓ | ✓ |
| CV Builder | ✓ | ✓ | ✓ |

### Packs de tokens (achat ponctuel)

| Pack | Prix | Tokens |
|------|------|--------|
| Pack 50 tokens | 5€ | 50 |
| Pack 100 tokens | 9€ | 100 |

**Usage des tokens :** génération IA (emails, LM, score CV) — 1 action IA = 1 token

### IDs Stripe (production)

| Produit | Product ID | Price ID |
|---------|-----------|----------|
| Standard | `prod_TfcggrdvMApvwb` | `price_1SiHQsKkkIHh6Ciw0GNQyKqa` |
| Premium | `prod_TfcgvmNBq9q0Ey` | `price_1SiHR4KkkIHh6CiwAM6trrO4` |
| Pack 50 tokens | `prod_Tfcgjrr4dczx18` | `price_1SiHRPKkkIHh6CiwLLZhqmQP` |
| Pack 100 tokens | `prod_Tfcgt8kBYS7YpN` | `price_1SiHRZKkkIHh6CiwgBGkvm0U` |

---

## 6. Back-office Admin

Accessible via `/admin/*` — réservé aux utilisateurs avec rôle `admin` (table `user_roles`).

### 6.1 Dashboard (`/admin`)
- KPIs globaux : nb utilisateurs, emails envoyés total, recherches lancées
- Graphiques d'activité
- Accès rapide aux sections admin

### 6.2 Utilisateurs (`/admin/users`)
- Liste de tous les utilisateurs (pagination)
- Filtres : plan, date d'inscription, activité
- Page détail utilisateur (`/admin/users/:id`) :
  - Infos profil + abonnement
  - Historique emails envoyés
  - Activité récente
  - Actions : reset data, supprimer compte

### 6.3 Data Center (`/admin/data`)
Sous-sections analytics :
- **Vue d'ensemble** : métriques consolidées
- **Abonnements** : répartition plans, MRR, churn
- **Candidatures** : volumes d'emails, taux de réponse
- **Démographiques** : genre, niveau d'études, âge
- **Engagement** : rétention, sessions, actions par user
- **Tracking** : logs d'activité détaillés (`user_activity_logs`)

### 6.4 Tickets support (`/admin/tickets`)
- Liste des tickets ouverts / résolus
- Page détail ticket (`/admin/tickets/:id`) :
  - Message utilisateur + métadonnées (page courante, urgence)
  - Formulaire de réponse admin
  - Changement de statut

### 6.5 Promos (`/admin/promos`)
- Création de codes promo Stripe
- Liste des codes actifs avec stats d'utilisation
- Désactivation de codes

### 6.6 Entraînement ATS (`/admin/ats`)
- Gestion des professions de référence (`ats_professions`)
- Mots-clés par catégorie : primaires, secondaires, soft skills
- Revue des feedbacks utilisateurs (`ats_keyword_feedback`)
- Métriques d'entraînement (nb analyses, date dernier entraînement)

### 6.7 Équipe (`/admin/team`)
- Liste des membres avec rôles (`admin`, `support`, `analyst`)
- Ajout / révocation de rôles

### 6.8 CMS (`/admin/cms`)
- Éditeur de pages personnalisées (`cms_pages`)
- Bibliothèque de blocs réutilisables (`cms_blocks`)
- Éditeur de blocs (`/admin/block-editor/:id`) : HTML + CSS + JS
- Gestionnaire de médias (`MediaLibrary`)
- Statuts : brouillon / publié

### 6.9 SEO (`/admin/seo`)
- Méta titre, description, og:image par route
- Sitemap XML (`/sitemap.xml`)
- Robots.txt (`/robots.txt`)
- Stockage dans `seo_settings`

### 6.10 Chatbot (`/admin/chatbot`)
- Configuration du prompt système
- Sélection du modèle IA
- Base de connaissances (texte libre)
- Activation / désactivation du widget
- Stockage dans `chatbot_config`

---

## 7. Intégrations techniques

### Gmail OAuth

```
/connect-gmail
  → Redirect OAuth Google (scopes: gmail.send, gmail.readonly, gmail.modify)
  → /connect-gmail/callback (code exchange)
  → store-gmail-tokens (chiffrement AES-256 + stockage dans gmail_tokens)
  → refresh-gmail-token (auto-refresh avant expiration)
```

**Edge functions Gmail :**
- `send-gmail-emails` : envoi via API Gmail
- `schedule-gmail-draft` : création brouillon pour envoi planifié
- `sync-gmail-history` : synchronisation historique de la boîte
- `check-email-responses` : détection des réponses reçues
- `check-email-bounces` : détection des bounces

### Stripe

```
create-checkout → Stripe Checkout Session → Redirect paiement
  → stripe-webhook (événements: checkout.completed, subscription.updated/deleted)
  → Mise à jour subscriptions (plan_type, sends_limit, status)

customer-portal → Stripe Customer Portal (gestion abonnement)
check-subscription → Vérification statut abonnement
```

### France Travail API

- Edge function `france-travail` : proxy vers API Emploi Store
- Authentification OAuth2 client_credentials
- Endpoints : offres, référentiels (secteurs, contrats)

### Lovable AI (sans clé API requise)

Modèles disponibles utilisés :
- `google/gemini-2.5-flash` : génération emails, LM, analyse CV
- `openai/gpt-5-mini` : chatbot assistant, résumés

**Edge functions IA :**
- `generate-personalized-emails` : emails personnalisés par entreprise
- `generate-cover-letter` : lettre de motivation
- `analyze-cv-ats` : score ATS détaillé
- `ats-ai-review` : revue des mots-clés ATS
- `ai-sector-guide` : guide sectoriel IA
- `generate-cv-content` : contenu de CV
- `chatbot-assistant` : assistant conversationnel

### Autres edge functions

| Fonction | Rôle |
|----------|------|
| `search-companies` | Recherche INSEE/Sirene + filtres secteur/géo |
| `find-company-emails` | Scraping emails + formulaires contact |
| `scrape-websites` | Crawl sites entreprises |
| `parse-cv-document` | Extraction texte depuis PDF CV |
| `process-scheduled-emails` | Cron : envoi emails planifiés |
| `process-follow-ups` | Cron : envoi relances automatiques |
| `check-follow-up-reminders` | Cron : détection relances à déclencher |
| `check-campaign-reminders` | Cron : rappels de campagnes |
| `job-worker` | Worker file de travaux asynchrones |
| `send-system-email` | Emails transactionnels (confirmation, reset) |
| `custom-reset-password` | Flux reset password personnalisé |
| `admin-delete-user` | Suppression compte utilisateur (admin) |
| `admin-reset-user-data` | Reset données utilisateur (admin) |
| `admin-get-users` | Liste utilisateurs (admin) |
| `admin-manage-promos` | Gestion codes promo Stripe (admin) |
| `migrate-encrypt-tokens` | Migration chiffrement tokens Gmail |

---

## 8. Modèle de données

### Tables principales

#### `profiles`
Infos utilisateur étendues (1 par user).

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | uuid | = auth.users.id |
| `first_name`, `last_name`, `full_name` | text | Identité |
| `cv_content` | text | Contenu textuel du CV |
| `cv_file_url` | text | URL stockage PDF |
| `target_sectors` | json | Secteurs cibles (array) |
| `professional_interests` | json | Centres d'intérêt |
| `target_jobs` | text | Intitulés de poste visés |
| `objective` | text | Objectif de recherche |
| `education_level` | text | Niveau d'études |
| `onboarding_completed` | boolean | Onboarding terminé ? |

#### `subscriptions`
Abonnement actif de l'utilisateur (1 par user).

| Colonne | Type | Description |
|---------|------|-------------|
| `plan_type` | enum | `free` \| `simple` \| `plus` |
| `status` | enum | `active` \| `canceled` \| `past_due` \| `trialing` |
| `sends_limit` | int | Quota mensuel total |
| `sends_remaining` | int | Quota restant ce mois |
| `tokens_remaining` | int | Tokens IA restants |
| `stripe_subscription_id` | text | ID abonnement Stripe |
| `current_period_end` | timestamp | Fin de période |

#### `companies`
CRM entreprises (N par user).

| Colonne | Type | Description |
|---------|------|-------------|
| `nom`, `siren`, `siret` | text | Identité légale |
| `emails` | json | Emails trouvés (array) |
| `selected_email` | text | Email choisi pour envoi |
| `pipeline_stage` | text | Statut CRM |
| `website_url`, `career_site_url` | text | URLs |
| `company_insights` | json | Résumé IA de l'entreprise |
| `search_batch_id` | uuid | ID de la recherche d'origine |

#### `email_campaigns`
Emails individuels envoyés (N par user).

| Colonne | Type | Description |
|---------|------|-------------|
| `recipient` | text | Email destinataire |
| `subject`, `body` | text | Contenu email |
| `status` | text | `sent` \| `failed` \| `pending` |
| `response_category` | text | Catégorie réponse IA |
| `pipeline_stage` | text | Statut après réponse |
| `follow_up_enabled` | boolean | Relance activée ? |
| `follow_up_sent_at` | timestamp | Date relance envoyée |

#### `ats_professions`
Référentiel métier pour l'analyse ATS.

| Colonne | Type | Description |
|---------|------|-------------|
| `name` | text | Nom du métier |
| `primary_keywords` | json | Mots-clés essentiels |
| `secondary_keywords` | json | Mots-clés secondaires |
| `soft_skills` | json | Compétences comportementales |
| `aliases` | json | Noms alternatifs du métier |
| `excluded_words` | json | Mots à ignorer |

#### `job_queue`
File de travaux asynchrones pour les recherches.

| Colonne | Type | Description |
|---------|------|-------------|
| `status` | enum | `pending` \| `processing` \| `completed` \| `failed` |
| `search_params` | json | Paramètres de la recherche |
| `company_sirens` | text[] | SIRENs à traiter |
| `processed_count` | int | Traités |
| `success_count` | int | Succès |
| `is_premium` | boolean | User Premium ? (priorité) |

#### `user_roles`
Rôles administrateurs (séparé de profiles — sécurité).

| Rôle | Accès |
|------|-------|
| `admin` | Accès total back-office |
| `support` | Tickets + utilisateurs |
| `analyst` | Data Center (lecture) |
| `user` | Rôle par défaut (pas d'admin) |

#### Autres tables

| Table | Description |
|-------|-------------|
| `campaigns` | Campagnes groupées (batch d'envois) |
| `email_responses` | Réponses reçues (sync Gmail) |
| `scheduled_emails` | Emails planifiés (brouillons Gmail) |
| `user_generated_cvs` | CVs créés avec le builder |
| `cv_analyses` | Historique analyses ATS |
| `user_activity_logs` | Logs comportementaux (tracking) |
| `user_notifications` | Notifications in-app |
| `user_preferences` | Préférences (relances, Gmail watch) |
| `user_company_blacklist` | Entreprises blacklistées par l'user |
| `company_blacklist` | Blacklist globale (admin) |
| `gmail_tokens` | Tokens OAuth Gmail chiffrés |
| `email_templates` | Templates d'emails sauvegardés |
| `user_email_templates` | Templates personnalisés utilisateur |
| `referrals` | Système de parrainage |
| `token_transactions` | Historique mouvements tokens |
| `seo_settings` | Config SEO par route |
| `chatbot_config` | Config chatbot IA |
| `cms_pages` | Pages CMS |
| `cms_blocks` | Blocs CMS réutilisables |

### Fonctions SQL utiles

```sql
-- Vérifier si un user a un rôle admin
SELECT public.has_role('user-uuid', 'admin');

-- Consommer un crédit d'envoi
SELECT public.use_send_credit('user-uuid', 1);

-- Ajouter des tokens
SELECT public.add_tokens('user-uuid', 50, 'purchase', 'Pack 50 tokens');

-- Vérifier si une entreprise est blacklistée
SELECT public.is_company_blacklisted('123456789');
```

---

## 9. Glossaire termes métier

| Terme | Définition |
|-------|------------|
| **Candidature spontanée** | Email envoyé à une entreprise sans offre d'emploi publiée |
| **Crédit d'envoi** | Unité consommée par email envoyé (= `sends_remaining`) |
| **Token** | Unité consommée par action IA (génération email, LM, analyse CV) |
| **Pipeline** | Statut de progression d'une entreprise (contacté → entretien) |
| **ATS** | Applicant Tracking System — logiciel RH qui filtre les CVs par mots-clés |
| **Score ATS** | Score /100 mesurant la compatibilité d'un CV avec une offre |
| **Batch / Recherche** | Une session de recherche d'entreprises = 1 job dans la queue |
| **Relance** | Email de suivi envoyé si pas de réponse après N jours |
| **Gmail OAuth** | Connexion au compte Gmail de l'utilisateur pour envoyer en son nom |
| **Blacklist** | Entreprise exclue des résultats (contactée récemment ou invalide) |
| **LM** | Lettre de motivation générée par IA |
| **Template générique** | Email de candidature non-personnalisé (plans Gratuit/Standard) |
| **Plan Simple** | Abonnement Standard 14€/mois (nom DB: `simple`) |
| **Plan Plus** | Abonnement Premium 39€/mois (nom DB: `plus`) |
| **Feature gating** | Restriction d'accès à une fonctionnalité selon le plan souscrit |
| **Onboarding** | Processus d'initialisation du profil (4 étapes post-inscription) |
| **Insights** | Résumé IA généré sur une entreprise (activité, taille, contexte) |
| **Watch Gmail** | Surveillance boîte email en temps réel via Gmail API push notifications |

---

*Dernière mise à jour : Mars 2026 — Cronos v1.x*
