
## Diagnostic complet

**Problème 1 — CVPreview ne sait pas afficher les templates canvas-v2**
`CVPreview.tsx` ligne 526 : le `renderTemplate()` fait un `switch(templateId)` sur des valeurs en dur `"classic"`, `"dark"`, etc. Quand `templateId` est un UUID de la BDD (ex : `"4a2b..."`), ça tombe dans le `default:` → `ClassicTemplate`. Le template canvas-v2 n'est jamais rendu.

**Problème 2 — Aucune prévisualisation temps réel dans les étapes**
`CVBuilderEditor.tsx` est un layout à **2 colonnes** sur desktop : gauche = stepper + formulaire, droite = **absente**. L'aperçu du CV n'existe qu'à l'étape "Finalisation" (dans `StepFinalize`). Le bouton mobile "Aperçu" ouvre une modale, mais sur desktop il n'y a pas de colonne droite avec preview temps réel.

**Problème 3 — Mismatch de format entre CVData du builder et DynamicCVRenderer**
- `CVData` du builder (dans `cv-templates.ts`) a : `experiences[].bullets` (tableau de strings), `skills.technical[]`, `skills.soft[]`, `education[].dates`
- `CVData` de `DynamicCVRenderer.tsx` attend : `experiences[].description` (string), `skills: string[]`, `education[].year`
Il faut un adaptateur pour passer du format builder au format DynamicCVRenderer.

**Problème 4 — Données template non chargées dans l'éditeur**
`CVBuilderEditor` reçoit `templateId` (un UUID) mais ne charge pas le template depuis la BDD pour l'afficher. Il passe `templateId` à `CVPreview` qui ne sait pas l'utiliser.

---

## Solution

### Étape 1 — Adapter CVPreview pour les templates canvas-v2

Dans `CVPreview.tsx`, ajouter :
1. Un `useQuery` qui charge le template depuis `cv_templates` si `templateId` est un UUID (pas un des 6 IDs courts hardcodés)
2. Si le template est un `canvas-v2`, appeler `DynamicCVRenderer` avec un **adaptateur de données** qui convertit le format `CVData` builder → format `DynamicCVRenderer`
3. Sinon, continuer avec le switch actuel pour rétrocompat

Adaptateur `buildCVDataForRenderer(cvData: CVData) → RendererCVData` :
```text
experiences[].bullets.join("\n") → experiences[].description
skills.technical + skills.soft   → skills: string[]
education[].dates                → education[].year
personalInfo.firstName/lastName  → firstName, lastName (top level)
personalInfo.title               → title
... etc
```

### Étape 2 — Ajouter la prévisualisation temps réel sur la droite dans CVBuilderEditor

Modifier le layout de `CVBuilderEditor` : transformer le layout actuel `flex-row` en **3 colonnes** sur desktop :
- **Gauche** (w-[320px]) : stepper (existant, intact)  
- **Centre** (flex-1) : formulaires par étapes (existant, intact)  
- **Droite** (w-[380px]) : panneau de prévisualisation fixe, sticky, avec le CV en temps réel

La colonne droite contient :
- Titre "Aperçu en temps réel"  
- `CVPreview` scalé (scale ~0.55) avec le `templateId` et `designOptions` passés en props
- Le panneau est `sticky top-0 h-screen overflow-hidden` pour qu'il reste visible pendant le scroll du formulaire

Ajuster le bottom bar de navigation pour qu'elle ne couvre pas la colonne droite (`right-0` reste car la colonne droite est sticky et pas scrollable).

### Fichiers modifiés

| Fichier | Changement |
|---|---|
| `src/components/cv-builder/CVPreview.tsx` | + useQuery pour charger template canvas-v2 + DynamicCVRenderer + adaptateur de données |
| `src/components/cv-builder/CVBuilderEditor.tsx` | + colonne droite preview temps réel (desktop) + réajustement layout 3 colonnes |

### Ce qui NE change PAS

- Les 6 formulaires par étapes → intacts (texte éditable, emplacements des blocs restent fixes dans le template)
- La structure canvas-v2 du template → non modifiable par l'utilisateur (positions, tailles des blocs figées)
- Les templates codés en dur `classic/dark/light/geo/modern/minimal` → toujours fonctionnels en fallback
