
## Ce que j'ai compris de la demande

Tu veux un **éditeur visuel de templates CV** dans le backoffice admin (`/admin/cv-templates`) où tu peux :
- Construire la structure d'un template par drag & drop des sections
- Styliser chaque bloc visuellement (couleurs de fond, texte, bordures, sidebar)
- Voir un aperçu en temps réel avec les vraies données CVData (placeholder)
- Sauvegarder en base → le template devient dispo dans le CV Builder côté utilisateur

**Sections disponibles (avec statut obligatoire/optionnel) :**
- `contact` — Coordonnées (nom, email, tel, LinkedIn) — obligatoire
- `summary` — Mini paragraphe bio — obligatoire  
- `target_jobs` — Métiers cherchés — optionnel
- `experiences` — Expériences professionnelles — obligatoire
- `entrepreneurship` — Parcours entrepreneurial — optionnel
- `skills` — Compétences clés — obligatoire
- `education` — Formations et certifications — obligatoire
- `languages` — Langues — optionnel

---

## Architecture technique

### Layout de l'éditeur (3 colonnes)

```text
┌─────────────────────────────────────────────────────────────────┐
│  Header : Nom du template [input] · [Sauvegarder] [Annuler]     │
├──────────────┬─────────────────────────────┬───────────────────┤
│  LEFT PANEL  │      CANVAS (A4)            │  RIGHT PANEL      │
│              │                             │                   │
│  Blocs       │  ┌─────────────────────┐   │  Styles du bloc   │
│  disponibles │  │  [Contact bloc]     │   │  sélectionné :    │
│  (drag ici)  │  │  [Summary bloc]     │   │  - Fond couleur   │
│              │  │  [Expériences]  ← drag   │  - Texte couleur  │
│  ○ Contact   │  │  [Compétences]      │   │  - Padding        │
│  ○ Résumé    │  │  [Formation]        │   │  - Police         │
│  ○ Métiers   │  └─────────────────────┘   │  - Taille texte   │
│  ○ Expé.     │                             │  - Bordure        │
│  ○ Entrep.   │  Zone sidebar (optionnelle):│  - Border-radius  │
│  ○ Skills    │  ← toggle sidebar ON/OFF    │                   │
│  ○ Formations│                             │  Layout global:   │
│  ○ Langues   │                             │  - Sidebar ON/OFF │
│              │                             │  - Largeur sidebar│
└──────────────┴─────────────────────────────┴───────────────────┘
```

### Structure de données du template sauvegardé (JSONB)

```json
{
  "layout": "sidebar" | "full",
  "sidebarWidth": 72,
  "sidebarBg": "#0f1b3d",
  "mainBg": "#ffffff",
  "fontFamily": "Georgia, serif",
  "primaryColor": "#0f1b3d",
  "accentColor": "#c9a84c",
  "textColor": "#1a1a2e",
  "sections": [
    {
      "id": "contact",
      "zone": "sidebar" | "main",
      "order": 0,
      "enabled": true,
      "required": true,
      "styles": {
        "bg": "transparent",
        "textColor": "#ffffff",
        "fontSize": 10,
        "padding": "16px",
        "borderBottom": "1px solid rgba(255,255,255,0.1)"
      }
    },
    ...
  ]
}
```

### Rendu du template dans CVPreview

Le renderer dynamique lit ce JSON pour construire le composant React avec `style` inline — exactement comme les templates existants mais piloté par les données au lieu d'être hardcodé.

---

## Fichiers à créer / modifier

### Nouveaux fichiers
1. `src/pages/Admin/AdminCVTemplateBuilder.tsx` — L'éditeur complet (3 colonnes)
2. `src/components/cv-builder/DynamicCVRenderer.tsx` — Renderer qui lit le JSON template config pour afficher le CV (utilisé dans le builder ET dans CVPreview)

### Fichiers modifiés
3. `src/pages/Admin/AdminLayout.tsx` — Ajout de l'entrée nav "Templates CV"
4. `src/pages/Admin/index.ts` — Export du nouveau composant
5. `src/App.tsx` — Route `/admin/cv-templates` + `/admin/cv-templates/:id`
6. `src/components/cv-builder/CVPreview.tsx` — Ajouter le support du rendu dynamique quand `templateId === "custom"` → passe le JSON config au `DynamicCVRenderer`
7. `src/pages/CVBuilder.tsx` — Charger les templates custom depuis la table `cv_templates` en plus des templates hardcodés

### Base de données
La table `cv_templates` **existe déjà** avec `html_template`, `css_styles`, `thumbnail_url`. On va utiliser `html_template` pour stocker le JSON config (c'est un `text`, parfait pour du JSON stringify).

---

## Détail des composants de l'éditeur

### Panel gauche — Palette de blocs
- Liste des 8 sections avec icônes
- Badge "obligatoire" / "optionnel"
- Drag source (`draggable` HTML5 natif — pas de lib externe)
- Blocs déjà placés sur le canvas apparaissent grisés

### Canvas central — Zone de construction
- Représente la page A4 (210mm → `816px` à scale normal)
- **Si layout = sidebar** : deux zones drop (sidebar + main)
- **Si layout = full** : une zone drop unique
- Chaque bloc placé est réorganisable par drag & drop (réordonnement)
- Clic sur un bloc → le sélectionne et ouvre ses styles dans le panel droit
- Bouton `×` sur chaque bloc pour le retirer (sauf blocs obligatoires)
- Aperçu du contenu placeholder dans chaque bloc (ex: "Jean Dupont · email@..." pour contact)

### Panel droit — Panneau de styles
**Onglet "Bloc"** (styles du bloc sélectionné) :
- Couleur de fond (color picker)
- Couleur de texte (color picker)
- Taille de police (slider 8–14pt)
- Padding (slider)
- Bordure (toggle + couleur + épaisseur)

**Onglet "Global"** (styles du template entier) :
- Layout : radio "Sidebar" / "Pleine largeur"
- Largeur sidebar si sidebar (slider 60–100mm)
- Couleur sidebar
- Couleur fond principal
- Police globale (select : Georgia, Helvetica, Arial)
- Couleur primaire / accent (color pickers)

### Sauvegarde
- Bouton "Sauvegarder" → `INSERT/UPDATE` dans `cv_templates`
- Champ `name` = nom du template
- `html_template` = `JSON.stringify(templateConfig)`
- `css_styles` = `""` (non utilisé avec cette approche)
- `is_active = true`
- Toast de confirmation

---

## Intégration avec le CV Builder utilisateur

Dans `CVBuilder.tsx`, on charge les templates custom depuis la BDD et on les ajoute à `GALLERY_TEMPLATES`. Dans `CVPreview.tsx`, si le template est custom, on passe par `DynamicCVRenderer` au lieu du switch hardcodé.

---

## Ce que cet éditeur ne fera PAS (hors scope)
- Édition du contenu texte directement dans le canvas (c'est fait via le formulaire 6 étapes)
- Drag pixel-perfect avec coordonnées absolues (layout flex row/column seulement)
- Export template en image pour la galerie (thumbnail manuel)
