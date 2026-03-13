
## Problèmes à corriger

### 1. Drag-and-drop à supprimer
Les éléments palette (Texte, Forme, Ligne, sections CV) ont des props `draggable` + `onDragStart`. Le handler `onCanvasDrop` vit sur le canvas. Tout ça brouille la toolbar et le panneau gauche.

**Supprimer :**
- `paletteDragRef` (ref + tout usage)
- `onCanvasDrop` handler
- `draggable` + `onDragStart` sur les 3 boutons toolbar (Texte, Forme pleine, Ligne)
- `draggable` + `onDragStart` sur chaque carte de section dans le panneau gauche
- `onDragOver` + `onDrop` sur le `<div>` canvas
- Mettre à jour le texte "Clic ou glisser sur le canvas" → "Clic pour ajouter"

### 2. Réécriture complète du HTML import — approche iframe DOM

**Pourquoi l'approche IA échoue :** Gemini reçoit du texte HTML/CSS et *estime* des positions en pixels. Résultat : sections mal positionnées, grands gaps, dimensions incorrectes.

**Nouvelle approche — 100% client-side, 0 IA :**

```
Fichier HTML uploadé
→ Créer iframe caché (794px × 1123px = 210mm × 297mm à 96dpi)
→ Injecter le HTML via blob URL
→ Attendre onload + 200ms (fonts/layout)
→ querySelector sur chaque section/photo/h2
→ getBoundingClientRect() = positions EXACTES en px
→ Scaling: 595/794 ≈ 0.749 sur X, 842/1123 ≈ 0.749 sur Y
→ Mapper h2 text → SectionId par regex
→ Générer canvas-v2 JSON avec positions précises
→ Cleanup iframe
```

**Mapping section par regex sur le texte h2 :**
```
"expériences" / "professional" → "experiences"
"compétences" / "skills" / "outils" → "skills"
"formations" / "education" / "certifications" → "education"
"langues" / "soft skills" → "languages"
"profil" / "résumé" / "summary" → "summary"
"entrepreneuri" / "parcours entrepreneurial" → "entrepreneurship"
"métiers" / "objectifs pro" → "target_jobs"
```

**Extraction automatique depuis le DOM :**
- `img.photo` / `img[alt*="profil"]` / `.profile-photo` → element `image` avec `content="[PHOTO]"`
- `.header-content` / `header` / `.cv-header` → section `contact` (X ajusté si photo présente)
- Chaque `<section>` → `cv-section` avec sectionId mappé
- `h2` avec `border-bottom` ≠ none → element `divider` au bas du h2
- `getComputedStyle(cvPage).backgroundColor` → `backgroundColor` du canvas
- `getComputedStyle(body).fontFamily` → `fontFamily` du canvas
- `getComputedStyle(section).color` → `color` de chaque section

## Ce qu'on ne change pas

- Le rendu des `cv-section` dans le canvas (Jean Dupont placeholders) — c'est correct pour un éditeur de template, l'utilisateur remplira ses propres données
- L'edge function `html-to-canvas-template` (on la laisse, pas besoin de la supprimer)
- Tout le reste du builder (resize, sélection, panneau propriétés, sauvegarde)

## Fichier modifié

`src/pages/Admin/AdminCVTemplateBuilder.tsx` uniquement :
- Supprimer `paletteDragRef` + tout le drag-and-drop
- Réécrire `handleImportHTML` en client-side iframe parser
- Mettre à jour le texte du panneau gauche
- Corriger l'overlay loading pour couvrir les deux cas (PDF + HTML)
