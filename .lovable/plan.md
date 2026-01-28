

# Plan de corrections

## Resume des problemes identifies

1. **Deconnexion redirige vers `/auth` au lieu de la homepage** - Le composant `ProfileDropdown` redirige vers `/auth` alors que le hook `useAuth` redirige correctement vers `/`

2. **Double editeur de texte pour les plans basiques** - `GenericTemplateEditor` ET `Contenu de l'email` s'affichent ensemble, creant de la confusion. Solution : fusionner en un seul editeur avec possibilite de sauvegarder comme template

3. **Menu trop long avec des noms longs** - Les onglets se cachent sur mobile/petit ecran. Solution : utiliser des menus deroulants pour regrouper les fonctionnalites

---

## Correction 1 : Redirection apres deconnexion

**Fichier** : `src/components/ProfileDropdown.tsx`

**Probleme** : Ligne 51 - `navigate("/auth")` au lieu de `navigate("/")`

**Solution** : Changer la redirection vers la homepage

```typescript
// Avant
navigate("/auth");

// Apres  
navigate("/");
```

---

## Correction 2 : Fusionner les editeurs d'email

**Fichier** : `src/components/dashboard/UnifiedEmailSender.tsx`

**Probleme actuel** :
- Pour les non-Premium : `GenericTemplateEditor` s'affiche (lignes 876-877)
- PUIS `Contenu de l'email` s'affiche aussi (lignes 958-993)
- L'utilisateur voit 2 editeurs similaires

**Solution** :
1. Supprimer `GenericTemplateEditor` pour les non-Premium
2. Conserver uniquement la section `Contenu de l'email`
3. Ajouter un bouton "Sauvegarder comme template" dans cette section
4. Ajouter un selecteur pour charger un template existant

**Nouveau composant integre** :
```
+------------------------------------------+
| Contenu de l'email                       |
+------------------------------------------+
| [Charger un template : v Selecteur     ] |
|                                          |
| Objet: [_______________________________] |
|                                          |
| Message:                                 |
| [                                      ] |
| [                                      ] |
| [                                      ] |
|                                          |
| [Variables disponibles: {entreprise}...] |
|                                          |
| Pieces jointes: [+ Ajouter des fichiers] |
|                                          |
| [Sauvegarder comme template]             |
+------------------------------------------+
```

**Tables utilisees** :
- `user_email_templates` (existante) pour sauvegarder/charger les templates

---

## Correction 3 : Restructurer le menu avec dropdowns

**Fichiers** : `src/components/HorizontalNav.tsx` et `src/components/MobileNav.tsx`

**Probleme** : 6 onglets avec des noms longs = debordement

**Solution** : Regrouper avec des menus deroulants

**Nouvelle structure** :

```text
┌─────────────────────────────────────────────────────────┐
│  [Recherche d'entreprise v]  [Campagnes v]  [Offres]    │
│        │                          │                      │
│        └─> Entreprises trouvees   └─> Historiques &      │
│                                        relances          │
│            Recherche de contact                          │
└─────────────────────────────────────────────────────────┘
```

**Detail des dropdowns** :

1. **Recherche d'entreprise** (dropdown)
   - Nouvelle recherche (value: `search`)
   - Entreprises trouvees (value: `entreprises`)
   - Recherche de contact (value: `emails`, section: `search`)

2. **Campagnes** (dropdown)
   - Envoyer une campagne (value: `emails`, section: `send`)
   - Historiques & relances (value: `campaigns`)

3. **Offres d'emploi** (bouton simple, premium)

**Implementation technique** :
- Utiliser le composant `DropdownMenu` de shadcn/ui
- Chaque dropdown contient des `DropdownMenuItem`
- Le bouton principal affiche le nom du groupe actif

---

## Details techniques

### Modification 1 - ProfileDropdown.tsx

```typescript
// Ligne 51 : changer
navigate("/auth");
// en
navigate("/");
```

### Modification 2 - UnifiedEmailSender.tsx

- Supprimer l'import et l'utilisation de `GenericTemplateEditor` pour les non-Premium
- Ajouter dans la section "Contenu de l'email" :
  - Un selecteur de templates (utiliser `savedTemplates` deja charge)
  - Un bouton pour sauvegarder le contenu comme template
  - Les variables disponibles avec explication

### Modification 3 - HorizontalNav.tsx & MobileNav.tsx

- Importer `DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem` de shadcn
- Creer 2 groupes de menus
- Gerer l'etat actif en fonction de la route/tab selectionnee

---

## Fichiers a modifier

| Fichier | Modification |
|---------|-------------|
| `src/components/ProfileDropdown.tsx` | Changer redirection `/auth` -> `/` |
| `src/components/dashboard/UnifiedEmailSender.tsx` | Fusionner editeurs, ajouter templates |
| `src/components/HorizontalNav.tsx` | Restructurer avec dropdowns |
| `src/components/MobileNav.tsx` | Adapter pour mobile avec groupes |

---

## Resultat attendu

1. La deconnexion redirige vers la homepage
2. Un seul editeur d'email avec possibilite de sauvegarder/charger des templates
3. Menu compact avec 3 elements principaux au lieu de 6, sans debordement

