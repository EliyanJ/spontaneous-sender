
# Plan de Restructuration: Système de Feature Gating par Plan

## Vision Business

Tu souhaites créer **2 niveaux de plans** avec des fonctionnalités différentes:

| Fonctionnalité | Plan Gratuit/Basique | Plan Elite/Premium |
|----------------|---------------------|-------------------|
| Recherche entreprises | Automatique (aléatoire par département) | IA + Manuelle (secteur, ville precis) |
| Localisation | Département uniquement | Ville precise |
| Offres d'emploi | Non accessible | Accessible |
| Emails | Template generique unique | Personnalisation IA |
| Lettres de motivation | Non | Generation IA |
| Objets emails | Manuel | Generation IA |
| Credits/envois | Limite (ex: 50/mois) | Plus eleve (200-400/mois) |

---

## Architecture Technique

### 1. Nouveau systeme de Plans

**Modification de `src/lib/stripe-config.ts`:**

```text
Plans:
- FREE: 0 EUR - 5 envois/mois - Recherche auto departement seulement
- STANDARD: 14 EUR/mois - 100 envois - Recherche auto, template generique
- PREMIUM: 39 EUR/mois - 400 envois - Toutes fonctionnalites IA + offres emploi
```

### 2. Nouveau composant "Recherche Automatique"

Creation de `src/components/dashboard/AutomaticSearch.tsx`:
- Interface simple: selection de departement(s) francais
- Bouton "Rechercher automatiquement"
- Appel a l'API avec codes APE aleatoires
- Trouve automatiquement les emails
- Ajoute directement a la liste de l'utilisateur

```text
+--------------------------------------------------+
|  Recherche Automatique                           |
|                                                  |
|  Selectionnez votre zone geographique:           |
|  [v] Departement: 75 - Paris                     |
|  [v] Departement: 92 - Hauts-de-Seine            |
|                                                  |
|  Nombre d'entreprises: [20] (max 50 gratuit)     |
|                                                  |
|  [ Lancer la recherche automatique ]             |
|                                                  |
|  ------------------------------------------------|
|  Note: Les entreprises seront choisies           |
|  aleatoirement dans les secteurs porteurs.       |
|  Upgrade vers Premium pour choisir vos secteurs. |
+--------------------------------------------------+
```

### 3. Systeme de Feature Gating

**Nouveau fichier `src/lib/plan-features.ts`:**

```typescript
export const PLAN_FEATURES = {
  free: {
    canUseAISearch: false,
    canUseManualSearch: false,
    canUseAutomaticSearch: true,
    canAccessJobOffers: false,
    canGenerateAIEmails: false,
    canGenerateCoverLetters: false,
    canGenerateAISubjects: false,
    locationLevel: 'department', // vs 'city'
    maxCompaniesPerSearch: 20,
  },
  standard: {
    canUseAISearch: false,
    canUseManualSearch: false,
    canUseAutomaticSearch: true,
    canAccessJobOffers: false,
    canGenerateAIEmails: false,
    canGenerateCoverLetters: false,
    canGenerateAISubjects: false,
    locationLevel: 'department',
    maxCompaniesPerSearch: 50,
  },
  premium: {
    canUseAISearch: true,
    canUseManualSearch: true,
    canUseAutomaticSearch: true,
    canAccessJobOffers: true,
    canGenerateAIEmails: true,
    canGenerateCoverLetters: true,
    canGenerateAISubjects: true,
    locationLevel: 'city',
    maxCompaniesPerSearch: 200,
  }
};
```

**Nouveau hook `src/hooks/usePlanFeatures.ts`:**

```typescript
// Hook qui retourne les features disponibles pour l'utilisateur
// Basé sur le plan_type de la table subscriptions
export const usePlanFeatures = () => {
  // Retourne: { features, isLoading, planType }
};
```

### 4. Modifications de l'interface Recherche

**`src/components/dashboard/SearchCompanies.tsx`:**

```text
SI planType === 'premium':
  - Afficher tabs: [Recherche IA] [Recherche Manuelle]
  - Fonctionnement actuel

SI planType === 'free' ou 'standard':
  - Afficher uniquement le composant AutomaticSearch
  - Banner "Upgrade pour acceder a la recherche precise"
```

### 5. Modifications de l'interface Emails

**`src/components/dashboard/UnifiedEmailSender.tsx`:**

```text
SI planType === 'premium':
  - Toggle "Emails personnalises IA" visible
  - Toggle "Lettres de motivation IA" visible
  - Fonctionnement actuel

SI planType === 'free' ou 'standard':
  - Cacher les toggles IA
  - Afficher section "Template generique"
  - Un seul template pour tous les emails
  - Banner "Upgrade pour personnaliser vos emails avec l'IA"
```

**Nouveau composant `src/components/dashboard/GenericTemplateEditor.tsx`:**

Interface pour editer un template d'email generique qui sera envoye a toutes les entreprises:

```text
+--------------------------------------------------+
|  Votre template d'email                          |
|                                                  |
|  Objet: [Candidature spontanee - {poste}      ] |
|                                                  |
|  Corps:                                          |
|  [                                               |
|   Madame, Monsieur,                             |
|                                                  |
|   Je me permets de vous contacter...            |
|                                                  |
|   Variables disponibles: {entreprise}, {ville}  |
|  ]                                               |
|                                                  |
|  [ Sauvegarder le template ]                     |
+--------------------------------------------------+
```

### 6. Gating de l'onglet Offres d'emploi

**`src/pages/Index.tsx`:**

```typescript
// Dans HorizontalNav, cacher "Offres d'emploi" si pas premium
// OU afficher avec cadenas + message "Premium requis"
```

### 7. Composant UpgradeBanner

**Nouveau `src/components/UpgradeBanner.tsx`:**

```text
+--------------------------------------------------+
| [icone crown] Fonctionnalite Premium             |
|                                                  |
| Passez au plan Premium pour:                     |
| - Recherche IA et manuelle precise              |
| - Emails personnalises par l'IA                 |
| - Lettres de motivation generees                |
| - Acces aux offres d'emploi                     |
|                                                  |
| [ Voir les plans ] [ Plus tard ]                 |
+--------------------------------------------------+
```

---

## Fichiers a creer

1. `src/lib/plan-features.ts` - Configuration des features par plan
2. `src/hooks/usePlanFeatures.ts` - Hook pour acceder aux features
3. `src/components/dashboard/AutomaticSearch.tsx` - Recherche automatique
4. `src/components/dashboard/GenericTemplateEditor.tsx` - Template generique
5. `src/components/UpgradeBanner.tsx` - Banner d'upgrade
6. `src/components/FeatureGate.tsx` - Wrapper pour gater les features

## Fichiers a modifier

1. `src/lib/stripe-config.ts` - Restructurer les plans avec features
2. `src/pages/Index.tsx` - Logique de routing selon plan
3. `src/components/dashboard/SearchCompanies.tsx` - Conditionner l'affichage
4. `src/components/dashboard/UnifiedEmailSender.tsx` - Cacher options IA
5. `src/components/dashboard/JobOffers.tsx` - Ajouter gating
6. `src/components/HorizontalNav.tsx` - Cacher/montrer onglets selon plan
7. `src/pages/Pricing.tsx` - Mettre a jour avec nouveaux plans

## Migration base de donnees

Ajouter une colonne pour stocker le template generique:

```sql
ALTER TABLE subscriptions 
ADD COLUMN generic_email_template JSONB DEFAULT NULL;
```

---

## Flux utilisateur final

### Utilisateur Gratuit/Standard:

```text
1. Connexion
2. Onglet "Recherche" -> Affiche AutomaticSearch
   - Choisit departement(s)
   - Clique "Rechercher"
   - Entreprises trouvees automatiquement
   - Emails trouves automatiquement
3. Onglet "Emails" -> GenericTemplateEditor
   - Configure son template unique
   - Envoie a toutes les entreprises
4. Onglet "Offres d'emploi" -> UpgradeBanner
```

### Utilisateur Premium:

```text
1. Connexion
2. Onglet "Recherche" -> Affiche AI + Manuel
   - Recherche precise par secteur/ville
3. Onglet "Emails" -> UnifiedEmailSender complet
   - Toggle IA emails
   - Toggle lettres de motivation
4. Onglet "Offres d'emploi" -> Accessible
```

---

## Ordre d'implementation

1. Creer `plan-features.ts` et `usePlanFeatures.ts`
2. Creer `AutomaticSearch.tsx`
3. Creer `UpgradeBanner.tsx` et `FeatureGate.tsx`
4. Modifier `SearchCompanies.tsx` avec condition de plan
5. Modifier `UnifiedEmailSender.tsx` pour cacher options IA
6. Creer `GenericTemplateEditor.tsx`
7. Modifier `HorizontalNav.tsx` et `Index.tsx` pour le gating
8. Mettre a jour `Pricing.tsx` avec les nouveaux plans
9. Migration DB pour le template generique
