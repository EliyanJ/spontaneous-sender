
## Stratégie cookies + analytics — Ce que je propose d'implémenter

### Contexte : ce que le projet a déjà
- `useActivityTracking` : tracking interne (sessions, clics, recherches) → stocké en base dans `user_activity_logs`
- `AdminActivity` : visualisation admin des logs d'activité
- `AdminAnalytics` : dashboard analytics basé sur les données internes

### Ce que je vais implémenter — 100% maison, sans service tiers

#### Approche : analytics first-party + bannière RGPD

**Pourquoi éviter les solutions tierces (Google Analytics, Hotjar, etc.) ?**
- Elles posent des problèmes RGPD sévères (transfert de données hors UE)
- Elles ralentissent le site (scripts tiers)
- Tu possèdes déjà une infrastructure de tracking interne dans `user_activity_logs`

**Ce qui sera implémenté :**

---

### 1. Bannière de consentement cookies (`src/components/CookieBanner.tsx`)

Bannière en bas de page avec 3 options :
- **Tout accepter** → active le tracking comportemental étendu
- **Essentiels uniquement** → session auth seulement (fonctionnement du site)
- **Personnaliser** → popover avec 3 catégories toggle :
  - ✅ Cookies essentiels (toujours actifs, non désactivables)
  - 🔘 Cookies analytiques (comportement : pages vues, durée, clics)
  - 🔘 Cookies de préférences (thème, dernière page visitée, filtres)

Le choix est stocké dans `localStorage` sous `cookie_consent` et dans la base de données (table `cookie_consents`).

---

### 2. Hook `useCookieConsent` (`src/hooks/useCookieConsent.ts`)

Expose :
```ts
{ hasConsented, analyticsEnabled, preferencesEnabled, acceptAll, rejectAll, updateConsent }
```

Le hook `useActivityTracking` lira ce hook avant d'enregistrer quoi que ce soit → **respect du consentement garanti**.

---

### 3. Extension du tracking analytics (avec consentement)

Nouveaux events trackés si `analyticsEnabled` :
- `page_view` avec le chemin
- `feature_used` (CV builder, recherche d'email, etc.)
- `time_on_page` (durée passée sur chaque onglet)
- `button_click` (actions critiques)

---

### 4. Table `cookie_consents` en base

```sql
CREATE TABLE cookie_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,           -- null si visiteur non connecté
  session_fingerprint text,  -- hash IP+UserAgent anonymisé
  analytics_accepted boolean DEFAULT false,
  preferences_accepted boolean DEFAULT false,
  consented_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

Utile pour :
- Prouver le consentement (obligation RGPD)
- Voir dans l'admin combien d'utilisateurs ont accepté/refusé

---

### 5. Dashboard admin enrichi (`src/pages/Admin/AdminAnalytics.tsx`)

Ajout de 2 widgets :
- **Taux d'acceptation cookies** : % accepté / essentiels / refusé
- **Top fonctionnalités utilisées** : basé sur `feature_used` events

---

### Fichiers créés/modifiés

| Fichier | Action |
|---------|--------|
| `src/components/CookieBanner.tsx` | Nouveau — bannière RGPD |
| `src/hooks/useCookieConsent.ts` | Nouveau — gestion consentement |
| `src/hooks/useActivityTracking.ts` | Modifier — respecter le consentement |
| `src/App.tsx` | Ajouter `<CookieBanner />` |
| `src/pages/Admin/AdminAnalytics.tsx` | Ajouter widget taux d'acceptation |
| Migration SQL | Table `cookie_consents` + RLS |

---

### Comment exploiter les données

Une fois implémenté, dans l'admin (`/admin` → Analytics) :
- Voir quelles features sont les plus utilisées
- Voir les pages les plus visitées
- Voir le taux de conversion (landing → inscription)
- Voir la durée moyenne des sessions
- Voir combien d'users ont accepté le tracking

Tout est **first-party**, hébergé dans ta propre base, **conforme RGPD** car tu as le consentement explicite.
