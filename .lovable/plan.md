
## Ce que je comprends

L'utilisateur veut un éditeur style **Canva** — pas un outil de drag & drop de sections prédéfinies, mais un vrai éditeur canvas où on peut :
- Placer des éléments librement (blocs de texte, formes, lignes, images)
- Positionner avec la souris (drag pour déplacer, handles pour redimensionner)
- Changer couleur, police, taille, fond, bordures via un panel
- Ajouter du texte libre (pas seulement des sections préfixées)
- Les sections CV (expériences, etc.) sont des blocs suggérés qu'on peut placer, mais pas obligatoires
- Tout ça sauvegardé en JSON et rendu dynamiquement dans le CV Builder

## Architecture : Éditeur Canvas libre (style Canva/Figma simplifié)

### Principe technique
Chaque élément est un objet avec position `x, y`, dimensions `width, height`, type (`text` | `cv-section` | `shape` | `divider`), et styles inline. Le canvas est une `div` avec `position: relative`, chaque bloc a `position: absolute`. Drag avec mousedown/mousemove/mouseup natif sur le canvas.

### Types d'éléments
- **`text`** : Texte libre éditable (double-clic → contentEditable), position absolue
- **`cv-section`** : Un des 8 blocs CV avec contenu placeholder dynamique
- **`shape`** : Rectangle coloré (pour fonds, barres décoratives, sidebar)
- **`divider`** : Ligne horizontale/verticale

### Structure JSON sauvegardée (nouvelle)
```json
{
  "canvasWidth": 595,
  "canvasHeight": 842,
  "fontFamily": "Helvetica",
  "elements": [
    {
      "id": "el-1",
      "type": "shape",
      "x": 0, "y": 0, "width": 180, "height": 842,
      "styles": { "backgroundColor": "#0f1b3d", "borderRadius": 0 }
    },
    {
      "id": "el-2",
      "type": "cv-section",
      "sectionId": "contact",
      "x": 10, "y": 20, "width": 160, "height": 120,
      "styles": { "color": "#fff", "fontSize": 10, "fontFamily": "Helvetica" }
    },
    {
      "id": "el-3",
      "type": "text",
      "x": 200, "y": 30, "width": 370, "height": 40,
      "content": "MON CV PROFESSIONNEL",
      "styles": { "fontSize": 22, "fontWeight": "700", "color": "#0f1b3d" }
    }
  ]
}
```

### Interface (3 colonnes)
```text
┌────────────────────────────────────────────────────────────────────┐
│  [← Retour] [Nom du template_______] [Annuler] [Sauvegarder ✓]     │
│  [T Texte] [⬛ Forme] [─ Ligne] [📋 Section CV ▾] [🖼 Image]        │
├──────────────┬──────────────────────────────────┬─────────────────┤
│  LEFT PANEL  │        CANVAS A4 (595×842px)      │  RIGHT PANEL    │
│              │  ┌────────────────────────────┐  │                 │
│  Sections CV │  │ ████ (shape fond sidebar)  │  │  Élément selec: │
│  suggérées   │  │ [Contact]  [Titre texte]   │  │  - Position x,y │
│  (drag/clic  │  │ [Skills]   [Expériences]   │  │  - W / H        │
│  pour ajouter│  │ [Languages][Formation]     │  │  - Couleur fond │
│  sur canvas) │  │            [Ligne déco]    │  │  - Couleur texte│
│              │  └────────────────────────────┘  │  - Police       │
│  Rappel :    │                                   │  - Taille fonte │
│  • Expériences│  Clic sur élément → sélection   │  - Gras/Italic  │
│  • Contact   │  Drag → déplace                  │  - Border       │
│  • Résumé    │  Double-clic texte → édite        │  - BorderRadius │
│  • Skills    │  Handles coin → redimensionne     │  - Opacité      │
│  • Formation │                                   │  - Z-index      │
│  • Langues   │                                   │  - Supprimer    │
└──────────────┴──────────────────────────────────┴─────────────────┘
```

## Plan d'implémentation

### Réécrire complètement `AdminCVTemplateBuilder.tsx`

Un seul fichier, tout de A à Z. Structure :

**1. Types**
```typescript
type ElementType = "text" | "cv-section" | "shape" | "divider";
interface CanvasElement {
  id: string;
  type: ElementType;
  x: number; y: number;
  width: number; height: number;
  sectionId?: SectionId; // si type = "cv-section"
  content?: string;      // si type = "text"
  styles: {
    backgroundColor?: string;
    color?: string;
    fontSize?: number;
    fontWeight?: string;
    fontStyle?: string;
    fontFamily?: string;
    borderRadius?: number;
    border?: string;
    opacity?: number;
    textAlign?: string;
    zIndex?: number;
  };
}
interface CanvasConfig {
  canvasWidth: number;
  canvasHeight: number;
  backgroundColor: string;
  fontFamily: string;
  elements: CanvasElement[];
}
```

**2. Interactions canvas (mousedown/move/up)**
- `onMouseDown` sur un élément → start drag (mode "move")
- `onMouseDown` sur un handle de coin → start resize
- `onDoubleClick` sur un élément `text` → passe en mode édition `contentEditable`
- Clic sur canvas vide → désélectionne
- Suppression avec touche `Delete` ou `Backspace` quand un élément est sélectionné

**3. Left panel**
- Boutons d'ajout rapide : Ajouter Texte, Ajouter Forme, Ajouter Ligne
- Liste des 8 sections CV avec icônes — clic ou drag → ajoute au centre du canvas
- Section "Formes" : rectangle plein, rectangle vide (bordure)

**4. Toolbar haut du canvas**
- Police globale + taille
- Raccourcis : Gras, Italique, Alignement texte
- Ordre (monter/descendre z-index)
- Groupement couleurs rapides

**5. Right panel (propriétés de l'élément sélectionné)**
- Onglet "Position & Taille" : x, y, w, h en inputs numériques
- Onglet "Style" : couleur fond, couleur texte, police, taille, gras/italic, bordure, radius, opacité
- Bouton "Supprimer l'élément" en rouge en bas

**6. Sauvegarde**
- `JSON.stringify(canvasConfig)` dans `html_template`
- Compatible avec l'existant (on détecte si c'est l'ancien format sections ou le nouveau format elements)

**7. DynamicCVRenderer mis à jour**
- Détecter le nouveau format (`config.elements` présent)
- Rendre chaque élément en `position: absolute` avec ses styles
- Pour `cv-section` : rendre le contenu placeholder de la section

### Fichiers modifiés
1. `src/pages/Admin/AdminCVTemplateBuilder.tsx` — Réécriture complète
2. `src/components/cv-builder/DynamicCVRenderer.tsx` — Support du nouveau format canvas

### Pas de nouvelles dépendances
Tout en vanilla React (mousedown/move/up), pas de react-dnd, pas de konva, pas de fabric.js — pour rester léger et dans les contraintes du projet.

### Gestion de la rétrocompatibilité
L'ancien format (`config.sections`) reste supporté dans `DynamicCVRenderer`. Le nouveau format (`config.elements`) est détecté par la présence du champ `elements`.
