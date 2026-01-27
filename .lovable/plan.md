

# Plan: Redesign Page Login Style Shopify

## Objectif

Refondre la page `/login` pour qu'elle ressemble au style de Shopify avec:
- Un fond degrade (gradient) au lieu du fond uni actuel
- Une carte blanche centrale bien visible avec ombre
- Des bordures plus marquees sur les boutons et champs
- Le bouton Passkey desactive avec un toast "bientot disponible"

---

## Modifications a apporter

### Fichier: `src/pages/Login.tsx`

### 1. Fond avec gradient

Remplacer le fond `bg-background` par un gradient inspire de Shopify:

```text
Actuel: bg-background
Nouveau: bg-gradient-to-br from-indigo-900 via-purple-900 to-teal-800

En mode clair: gradient violet/teal
En mode sombre: gradient plus fonce
```

### 2. Carte blanche centrale

Ajouter un conteneur blanc avec:
- Fond blanc (`bg-white` / `bg-card` en dark mode)
- Coins arrondis (`rounded-xl` ou `rounded-2xl`)
- Ombre portee (`shadow-2xl`)
- Padding interne (`p-8` ou `p-10`)
- Largeur fixe (`max-w-md`)

```text
Structure:
+----------------------------------------------------------+
|  [Gradient Background - Plein ecran]                     |
|                                                          |
|      +----------------------------------------+          |
|      |  [Carte blanche avec ombre]            |          |
|      |                                         |          |
|      |  [Logo Cronos]                          |          |
|      |  Cronos                                 |          |
|      |                                         |          |
|      |  [ Continuer avec Email ]               |          |
|      |  [ Connexion cle d'acces ] (desactive)  |          |
|      |  [ Continuer avec Google ]              |          |
|      |                                         |          |
|      |  ------------- ou -------------         |          |
|      |                                         |          |
|      |  Nouveau sur Cronos? Creer compte       |          |
|      |                                         |          |
|      |  Aide | Confidentialite | Conditions    |          |
|      +----------------------------------------+          |
|                                                          |
+----------------------------------------------------------+
```

### 3. Bordures plus visibles

Modifier les classes des boutons pour avoir des bordures plus marquees:

```text
Actuel: variant="outline" (bordure subtile)
Nouveau: Ajouter classes explicites:
  - border-2 (plus epais)
  - border-gray-300 (couleur visible)
  - hover:border-gray-400 (effet hover)
  - focus:border-primary focus:ring-2 (focus visible)
```

### 4. Bouton Passkey desactive

Le bouton Passkey doit indiquer qu'il n'est pas disponible:
- Ajouter une opacite reduite (`opacity-60`)
- Garder le toast actuel "bientot disponible"
- Optionnel: ajouter un badge "Bientot"

### 5. Separateur "ou" style Shopify

Ajouter un separateur avec le texte "ou" entre les boutons et le lien inscription:

```text
------------ ou ------------
```

---

## Code CSS/Tailwind

### Classes pour la carte:

```css
/* Carte principale */
bg-white dark:bg-gray-900
rounded-2xl
shadow-2xl
p-8 sm:p-10
w-full max-w-md
border border-gray-200 dark:border-gray-700
```

### Classes pour le fond gradient:

```css
/* Fond de page */
min-h-screen
bg-gradient-to-br from-indigo-900 via-purple-900 to-teal-800
dark:from-gray-900 dark:via-gray-800 dark:to-gray-900
```

### Classes pour les boutons:

```css
/* Boutons avec bordure visible */
border-2 border-gray-300 dark:border-gray-600
hover:border-gray-400 dark:hover:border-gray-500
hover:bg-gray-50 dark:hover:bg-gray-800
```

---

## Comparaison avant/apres

### Avant:
- Fond uni (bg-background)
- Pas de carte conteneur
- Bordures subtiles peu visibles
- Bouton Passkey actif (mais non fonctionnel)

### Apres:
- Fond gradient colore style Shopify
- Carte blanche avec ombre bien demarquee
- Bordures plus epaisses et visibles
- Bouton Passkey visuellement desactive avec indication "Bientot"
- Separateur "ou" entre les sections

---

## Fichier a modifier

| Fichier | Changements |
|---------|-------------|
| `src/pages/Login.tsx` | - Ajouter gradient en fond de page |
|                        | - Wrapper le contenu dans une carte avec ombre |
|                        | - Renforcer les bordures des boutons |
|                        | - Ajouter style desactive sur bouton Passkey |
|                        | - Ajouter separateur "ou" |

---

## Impact

- **Visuel**: Page de login beaucoup plus professionnelle et moderne
- **UX**: Les elements sont clairement visibles et separes
- **Coherence**: Style similaire aux standards de l'industrie (Shopify)
- **Dark mode**: Le gradient s'adaptera au theme sombre

