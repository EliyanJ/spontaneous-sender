

# Plan : Suppression de comptes admin + Centre de Data avance

## Resumo

Deux grandes fonctionnalites a implementer dans le backoffice admin :
1. **Suppression/reset de comptes utilisateurs** avec nettoyage complet des donnees
2. **Centre de Data avance** avec tableaux de bord detailles inspires de GA4

---

## Partie 1 : Suppression de comptes utilisateurs

### Contexte
Actuellement, la page AdminUserDetail affiche les infos d'un utilisateur mais ne permet pas de supprimer son compte ou de reset ses donnees.

### Ce qui sera ajoute

**Bouton "Supprimer le compte"** dans AdminUserDetail avec confirmation en 2 etapes :
- Dialogue de confirmation avec saisie de l'email pour valider
- Options granulaires : supprimer tout OU reset partiel (supprimer seulement les donnees Gmail, les entreprises, les emails...)

**Edge function `admin-delete-user`** qui effectue :
- Suppression des donnees dans toutes les tables liees (companies, email_campaigns, gmail_tokens, gmail_watch_config, scheduled_emails, job_queue, user_activity_logs, user_company_blacklist, user_preferences, user_email_templates, user_cv_profiles, subscriptions, token_transactions, email_responses, user_notifications, referrals, support_tickets, campaigns, email_logs, profiles)
- Suppression du compte dans auth.users via l'API admin
- Verification du role admin avant execution

**Edge function `admin-reset-user-data`** pour le reset partiel :
- Reset Gmail : supprime gmail_tokens + gmail_watch_config
- Reset entreprises : supprime companies + email_campaigns + email_logs
- Reset abonnement : remet le plan en "free" avec les credits par defaut

### Securite
- Seuls les admins peuvent executer ces actions (verification via `has_role`)
- Log de l'action dans user_activity_logs avec l'ID de l'admin qui effectue l'action
- Impossible de supprimer son propre compte admin

---

## Partie 2 : Centre de Data avance

### Architecture
Nouvelle page **AdminDataCenter** accessible via un nouvel onglet "Data" dans la navigation admin, avec un mini-menu lateral (style GA4) pour naviguer entre les sections.

### Sections du Data Center

**1. Vue d'ensemble (Overview)**
- Nombre total d'utilisateurs, entreprises, emails envoyes, recherches
- Graphique d'evolution des inscriptions (30 derniers jours)
- Taux d'activite (utilisateurs actifs / total)
- KPI en cards avec pourcentages de variation

**2. Candidatures**
- Nombre total d'entreprises postulees par tous les utilisateurs
- Repartition par region (camembert)
- Repartition par secteur d'activite (barres horizontales, top 10)
- Taux d'utilisation des lettres de motivation automatisees (pie chart)
- Taux d'utilisation de l'objet personnalise vs generique

**3. Tracking & Reponses**
- Pourcentage d'utilisateurs qui utilisent le suivi (pipeline/tracking)
- Taux de reponse global (emails avec reponse / total envoyes)
- Repartition des categories de reponses (positif, negatif, neutre...)
- Utilisateurs qui trackent vs ceux qui ne trackent pas (barre)

**4. Abonnements**
- Repartition des types d'abonnement Free/Standard/Premium (camembert)
- Evolution des conversions dans le temps
- Revenus estimes (nombre d'abonnes payants)

**5. Engagement**
- Frequence moyenne de connexion par utilisateur
- Temps moyen passe sur l'application (base sur les sessions)
- Nombre moyen de candidatures par utilisateur
- Taux d'utilisation de l'onglet "Offres d'emploi"

**6. Demographics**
- Repartition par niveau d'etudes (camembert)
- Repartition par age (histogramme)
- Note : le sexe n'est pas collecte actuellement a l'inscription. Il faudra ajouter un champ "genre" au formulaire d'inscription et a la table profiles pour avoir cette donnee.

### UX/UI
- Navigation laterale compacte avec icones + labels (style GA4)
- Maximum 2 graphiques par ligne (comme demande)
- Filtres de periode en haut (7j, 30j, 90j, tout)
- Chiffres cles en cards au-dessus des graphiques avec indicateurs de tendance
- Utilisation de Recharts (deja installe) pour tous les graphiques
- Palette de couleurs coherente avec le theme existant

---

## Partie technique

### Nouveaux fichiers

```text
src/pages/Admin/AdminDataCenter.tsx        -- Page principale avec mini-nav
src/pages/Admin/data/DataOverview.tsx       -- Section vue d'ensemble
src/pages/Admin/data/DataCandidatures.tsx   -- Section candidatures
src/pages/Admin/data/DataTracking.tsx       -- Section tracking
src/pages/Admin/data/DataAbonnements.tsx    -- Section abonnements
src/pages/Admin/data/DataEngagement.tsx     -- Section engagement
src/pages/Admin/data/DataDemographics.tsx   -- Section demographics
supabase/functions/admin-delete-user/index.ts
supabase/functions/admin-reset-user-data/index.ts
```

### Fichiers modifies

```text
src/pages/Admin/AdminLayout.tsx        -- Ajout onglet "Data" dans la nav
src/pages/Admin/AdminUserDetail.tsx    -- Ajout boutons supprimer/reset
src/pages/Admin/index.ts               -- Export AdminDataCenter
src/App.tsx                            -- Route /admin/data
```

### Migration SQL

- Ajout de la colonne `gender` (text, nullable) a la table `profiles`
- Mise a jour du formulaire Register.tsx pour collecter le genre

### Edge functions

Les deux nouvelles edge functions (`admin-delete-user`, `admin-reset-user-data`) utiliseront le `SUPABASE_SERVICE_ROLE_KEY` pour acceder aux donnees de tous les utilisateurs et a l'API admin de suppression de compte.

### Donnees aggregees

Les requetes du Data Center utilisent les politiques RLS existantes (les admins ont deja acces en lecture a toutes les tables pertinentes). Les aggregations seront faites cote client avec les donnees Supabase.

