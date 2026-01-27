

# Plan d'amélioration UX pour Cronos

## Contexte du problème

### Problème 1: Workflow Email Search
Actuellement, quand tu recherches 10 entreprises, la page "Trouver des contacts" propose de chercher les emails pour **toutes** les entreprises sans email (88 au total), pas seulement les 10 que tu viens de trouver. C'est confus car ça mélange les recherches de différentes périodes.

### Problème 2: Interface Profil
- Pas d'accès rapide au profil depuis le header
- Le bouton Paramètres (icône engrenage) devrait être à droite de la lune (thème)

---

## Solution proposée

### 1. Nouveau système de "Batches" de recherche

**Modification base de données:**
Ajouter une colonne `search_batch_id` (UUID) et `search_batch_date` (timestamp) à la table `companies` pour identifier les entreprises d'une même recherche.

**Flux amélioré:**
1. **Recherche d'entreprises** → Les 10 résultats sont sauvegardés avec un `search_batch_id` commun
2. **Page Email Search** → Affiche 3 options claires :
   - 🔵 **"Recherche actuelle"** (10 entreprises du batch en cours)
   - 🔘 **"Contacts précédents sans email"** (entreprises d'autres batches qui n'ont pas encore d'email trouvé)
   - 🔘 **"Historique pour campagne"** (entreprises avec email mais sans envoi effectué)

### 2. Nouvelle interface Email Search

```
┌──────────────────────────────────────────────────────────────┐
│  Trouver des contacts                                        │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ 🔍 Recherche du [27 jan. 2026]              10 contacts │ │
│  │    ○ Sélectionner cette recherche                       │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ 📂 Recherches précédentes                   78 contacts │ │
│  │    ○ 20 jan. 2026 (15 contacts, 8 sans email)          │ │
│  │    ○ 15 jan. 2026 (12 contacts, 5 sans email)          │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ 📧 Prêts pour campagne                      45 contacts │ │
│  │    (avec email, non encore contactés)                   │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│            [ Lancer la recherche d'emails ]                  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 3. Header avec icône Profil

**Nouvelle disposition du header:**
```
┌────────────────────────────────────────────────────────────────────┐
│ [Logo] Cronos    [Nav: Recherche | Entreprises | Emails | ...]    │
│                                                    [👤] [⚙️] [🌙] │
└────────────────────────────────────────────────────────────────────┘
```

- **[👤]** = Avatar/initiales cliquable → ouvre dropdown avec:
  - Email de l'utilisateur
  - Lien vers Paramètres > Profil
  - Bouton Déconnexion

- **[⚙️]** = Paramètres (déplacé à droite de l'avatar)
- **[🌙]** = Toggle thème (reste à l'extrême droite)

---

## Détails techniques

### Phase 1: Migration base de données
```sql
ALTER TABLE companies 
ADD COLUMN search_batch_id UUID,
ADD COLUMN search_batch_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();
```

### Phase 2: Modifications composants

**Fichiers à modifier:**
1. `src/components/dashboard/SearchCompanies.tsx` 
   - Générer un `search_batch_id` unique lors de `saveAllCompanies`
   
2. `src/components/dashboard/EmailSearchSection.tsx`
   - Remplacer la recherche globale par un sélecteur de batch
   - Grouper les entreprises par `search_batch_id`
   - Afficher les options de sélection

3. `src/pages/Index.tsx`
   - Ajouter le composant ProfileDropdown dans le header
   - Réorganiser: CreditsDisplay → ProfileDropdown → Settings → ThemeToggle

4. `src/components/HorizontalNav.tsx`
   - Retirer le bouton Settings (sera dans le header principal)

5. **Nouveau:** `src/components/ProfileDropdown.tsx`
   - Avatar avec initiales
   - Dropdown menu avec profil et déconnexion

### Phase 3: Edge Function
**Modifier `find-company-emails/index.ts`:**
- Accepter un paramètre `batchId` ou `companyIds[]`
- Limiter la recherche aux entreprises spécifiées

---

## Résumé des changements UX

| Avant | Après |
|-------|-------|
| Email search cherche TOUS les contacts | Choix du batch à traiter |
| Mélange des temporalités | Séparation claire par date/recherche |
| Pas d'icône profil | Avatar cliquable dans le header |
| Settings dans la nav | Settings à côté du toggle thème |

