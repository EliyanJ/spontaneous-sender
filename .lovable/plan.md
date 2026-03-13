
## Problèmes identifiés

### 1. Scroll horizontal dans l'aperçu
**Cause** : le div interne de 794px mis à l'échelle via `transform: scale(0.348)` ne réduit pas le layout — il reste 794px dans le flux. L'overflow déborde latéralement.
**Fix** : ajouter `overflow: "hidden"` sur le conteneur parent de 276px (ligne 890) pour clipper le contenu transformé. C'est déjà fait sur `HTMLCVRenderer` mais pas sur le rendu `CVPreview` dans la sidebar.

### 2. CV dépasse le format A4 (scroll vertical dans la preview)
**Cause** : le wrapper `CVPreview` en mode non-standalone (ligne 663 `CVPreview.tsx`) utilise `minHeight: "1123px"` — le contenu peut grandir librement au-delà. Les templates legacy utilisent aussi `min-height: 297mm`.

**Fixes multiples** :
- **Summary** : `maxLength` actuel = 600 caractères. C'est trop pour un A4. Réduire à **400 caractères max** et ajouter un avertissement visuel dès 350 chars.
- **Skills density** : actuellement `chunk[0]` → `detail_1`, `chunk.slice(1).join(", ")` → `detail_2`. Avec 4 par ligne, ça crée encore beaucoup de lignes. Passer à **6 par ligne** (1 en detail_1, 5 en detail_2) pour réduire le nombre de rangées de compétences.
- **Clipper le rendu preview** : dans `CVPreview.tsx` mode non-standalone, changer `minHeight` → `height` fixe + `overflow: hidden` pour forcer le format A4. Cela concerne l'aperçu seulement, pas l'export.

### 3. Layout des skills en colonnes
L'image uploadée montre 3 "rangées" de compétences dont la 3ème a seulement 2 éléments. Le restructurer pour avoir 2 colonnes équilibrées dans le template nécessite de changer comment les données sont structurées. 
- Nouvelle logique : au lieu de 1 rangée = 1 catégorie, générer **2 entrées par "rangée"** en remplissant le tableau de gauche (`detail_1`) et de droite (`detail_2`) avec des paires pour équilibrer visuellement.

---

## Fichiers à modifier

### `src/components/cv-builder/CVBuilderEditor.tsx`
- **Summary `maxLength`** : ligne ~249, passer de `maxLength={600}` → `maxLength={400}` et mettre à jour le compteur `/600` → `/400`, et le warning de `> 550` → `> 350`
- **Aperçu sidebar scroll horizontal** : ligne 890-897, le conteneur parent de 276px a déjà `overflow: "hidden"` → vérifier que c'est effectif. Sinon ajouter `overflowX: "hidden"` sur l'`aside` lui-même.

### `src/components/cv-builder/CVPreview.tsx`
- **Mode non-standalone** (ligne 663) : changer  
  `minHeight: "1123px"` → `height: "1123px"` + `overflow: "hidden"`  
  Cela clipe le contenu à la hauteur A4 exacte dans l'aperçu temps réel.

### `src/lib/cv-templates/adaptCVDataForTemplate.ts`
- **Skills density** : passer les chunks de 4 → **6 par ligne** (1 en `detail_1`, 5 autres en `detail_2`) pour économiser de la hauteur.
- **Équilibrage 2 colonnes** : diviser le tableau `tech` en deux moitiés (gauche/droite) et construire des lignes avec `detail_1 = gauche[i]` et `detail_2 = droite[i]` pour créer visuellement 2 colonnes équilibrées dans les templates qui supportent ce layout.

---

## Résumé visuel

```text
PROBLÈME                        FIX
────────────────────────────    ──────────────────────────────────────
Scroll horizontal dans aside    overflow: hidden sur le conteneur 276px
CV > A4 (trop de texte)        maxLength 600 → 400 (summary)
CV > A4 (trop de compétences)  chunks 4 → 6 skills par ligne
Colonnes inégales (3+3+2)      Répartition équilibrée gauche/droite
Preview > A4 dans sidebar       minHeight → height fixe + overflow:hidden
```
