
## Problème diagnostiqué

**Double scaling + double header** dans la colonne preview droite :

1. `CVBuilderEditor.tsx` ligne 883 : applique `scale(0.42)` sur `<CVPreview>` via un wrapper div
2. `CVPreview.tsx` lignes 630-648 : `CVPreview` **lui-même** ajoute un header ("Aperçu A4" + bouton "Imprimer / PDF") et applique encore `scale(0.7)` en interne sur le contenu du CV
3. Résultat : `0.42 × 0.7 = 0.29` → le CV est minuscule et décalé, le bouton "Imprimer / PDF" apparaît visible dans le visuel preview

## Solution

### Option A : Ajouter un mode `naked` à CVPreview (prop `standalone`)

Ajouter une prop `standalone?: boolean` à `CVPreview` :
- `standalone={true}` (défaut actuel) → affiche le header + bouton + son propre `scale(0.7)` interne — comportement actuel conservé pour la page Finalisation
- `standalone={false}` → rend **uniquement** le contenu du template, sans header, sans scale interne

Dans `CVBuilderEditor`, passer `standalone={false}` à `CVPreview` et garder uniquement le `scale(0.42)` externe.

### Changements précis

**`CVPreview.tsx`** :
- Ajouter prop `standalone?: boolean` (défaut `true`)
- Wrapper conditionnel : si `!standalone`, retourner directement `<div ref={previewRef}>{renderTemplate()}</div>` sans header ni scale interne

**`CVBuilderEditor.tsx`** ligne 884 :
- Changer `<CVPreview cvData={cvData} templateId={templateId} designOptions={designOptions} />` → `<CVPreview cvData={cvData} templateId={templateId} designOptions={designOptions} standalone={false} />`
- Ajuster le scale du wrapper : la colonne fait 360px, un A4 fait 794px → `360/794 ≈ 0.453`. Changer `scale(0.42)` → `scale(0.453)` pour mieux remplir la colonne
- Ajouter `height: "794px"` au wrapper pour que la colonne ait la bonne hauteur scrollable (294mm ≈ 1123px × 0.453 ≈ 509px visible)

## Fichiers modifiés

| Fichier | Changement |
|---|---|
| `src/components/cv-builder/CVPreview.tsx` | Prop `standalone` — si false, pas de header ni de scale interne |
| `src/components/cv-builder/CVBuilderEditor.tsx` | Passer `standalone={false}` + ajuster scale externe |
