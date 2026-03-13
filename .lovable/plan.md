
## Diagnostic précis

### Pourquoi les compétences créent des "vagues"

Le template HTML par défaut (dans `AdminCVTemplateBuilder.tsx`) définit :
```css
.skills-container { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
```
Et son item template est :
```html
<div class="skill-column">
  <p><strong data-field="category">Catégorie</strong></p>
  <p data-field="detail_1">Compétence 1</p>
  <p data-field="detail_2">Compétence 2</p>
</div>
```

`injectCVData` clone ce bloc **pour chaque ligne de données**. Avec 4 lignes de skills → 4 divs dans la grille 3 colonnes → la 4ème passe à la ligne, créant une "vague" inégale.

**Ce que `adaptCVDataForTemplate` génère actuellement :**
- Ligne 1 : `detail_1=JS`, `detail_2=React`, `detail_3=TypeScript`
- Ligne 2 : `detail_1=Python`, `detail_2=SQL`, `detail_3=Git`
- Ligne 3 : `detail_1=Figma`, `detail_2=Photoshop`, `detail_3=` (vide)

→ 3 blocs dans la grille = 3 colonnes visuelles correctes MAIS chaque bloc a une colonne verticale de 1 skill, pas une ligne horizontale.

**Le vrai problème** : le template HTML traite chaque entrée du `data-list` comme **une colonne**, pas une ligne. Donc avec 4 entrées de skills, on a 4 colonnes (la 4ème déborde). 

### Solution correcte

Deux changements coordonnés :

**1. Refonte du template HTML par défaut** (`AdminCVTemplateBuilder.tsx`) :
- Changer la structure skills : au lieu d'une grid sur le container et un `skill-column` par entrée, utiliser une structure `skill-row` avec 3 cellules `data-field` par ligne (`detail_1`, `detail_2`, `detail_3`)
- Le CSS : grid sur le conteneur mais avec `auto-fill` ou chaque `skill-row` = une ligne flex à 3 items
- Ajouter `overflow-x: hidden` sur `.cv-page` et `max-width: 100%` + `box-sizing: border-box`

**2. Correction CSS dans le template** :
```css
.skills-container { display: flex; flex-direction: column; gap: 4px; }
.skill-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; font-size: 12px; }
```

Et l'item template :
```html
<div class="skill-row">
  <span data-field="detail_1"></span>
  <span data-field="detail_2"></span>
  <span data-field="detail_3"></span>
</div>
```

Avec `category` affiché comme titre unique avant la liste (via la 1ère ligne `i===0`).

**3. Scroll horizontal** :
- Dans `CVBuilderEditor.tsx` ligne 888 : `ScrollArea` a déjà `overflowX: hidden` — vérifier que c'est bien transmis au viewport Radix. Ajouter `style={{ overflow: "hidden" }}` sur le `<div class="px-3 py-4">` interne.
- Dans `CVPreview.tsx` ligne 663 : ajouter `boxSizing: "border-box"` et `maxWidth: "100%"` sur les `.cv-page` legacy templates.

## Fichiers à modifier

### `src/pages/Admin/AdminCVTemplateBuilder.tsx`
- Mettre à jour `DEFAULT_TEMPLATE_HTML` : CSS `.cv-page` ajouter `overflow-x: hidden; max-width: 100%; box-sizing: border-box;`
- Changer `.skills-container` CSS : `display: flex; flex-direction: column; gap: 3px;`  
- Changer `.skill-row` CSS : `display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; font-size: 12px; padding: 2px 0;`
- Changer l'item template skills :
  ```html
  <div class="skill-row">
    <span data-field="detail_1"></span>
    <span data-field="detail_2"></span>
    <span data-field="detail_3"></span>
  </div>
  ```
  (supprimer category du bloc répété — afficher le titre "Compétences Clés" dans le `<h2>` fixe suffit)

### `src/components/cv-builder/CVBuilderEditor.tsx`
- Ligne 889 : div `px-3 py-4` → ajouter `overflowX: "hidden"` dans le style inline

### `src/components/cv-builder/CVPreview.tsx`
- Toutes les divs `.cv-page` (6 templates) : ajouter `overflowX: "hidden"` au style inline pour éviter tout débordement horizontal dans les templates legacy

## Résumé visuel

```text
AVANT                               APRÈS
───────────────────────────────     ───────────────────────────────
skills-container: grid 3 cols       skills-container: flex column
  skill-column (clonée N fois)        skill-row: grid 3 cols
  → 4 blocs = 4ème déborde              detail_1 | detail_2 | detail_3
  → "vague" visuelle                  → N lignes compactes, sans vague

Scroll horizontal                   overflow-x: hidden sur .cv-page
  .cv-page: 210mm fixe               + overflowX hidden sur containers
  → déborde dans le scaler         
```

Les templates HTML-v1 déjà créés en base de données ne seront pas affectés — seul le `DEFAULT_TEMPLATE_HTML` (template exemple du builder admin) est mis à jour. Les nouveaux templates créés bénéficieront de la bonne structure.
