# Rapport complet — Système Templates CV
## Admin → Utilisateur : Architecture & Fonctionnement étape par étape

> Généré le 13/03/2026 — Version courante du projet

---

## Vue d'ensemble de l'architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│  ADMIN SIDE                         USER SIDE                       │
│                                                                     │
│  AdminCVTemplates          →        CVBuilder (step "select")       │
│  (galerie / CRUD)                   (galerie publique filtrée)       │
│          │                                    │                     │
│          ↓                                    ↓                     │
│  AdminCVTemplateBuilder    →        CVBuilderEditor                 │
│  (éditeur canvas-v2)                (éditeur étapes + preview)       │
│          │                                    │                     │
│          ↓                                    ↓                     │
│  table cv_templates        →        DynamicCVRenderer               │
│  (JSON canvas-v2 stocké)            (rendu final A4)                 │
└─────────────────────────────────────────────────────────────────────┘
```

---

## PARTIE 1 — Côté Admin : Création de Templates

### 1.1 Page liste — `AdminCVTemplates.tsx`

**Route :** `/admin/cv-templates`

**Ce que ça fait :**
- Charge tous les templates depuis `supabase → table cv_templates` (tous, actifs ou non)
- Affiche une grille de cartes (thumbnail + nom + badge actif/inactif + badge "Canvas")
- **Badge "Canvas"** : détecté en parsant `html_template` pour voir si `version === "canvas-v2"` → distingue les vieux templates legacy des nouveaux canvas
- Actions par carte :
  - **Modifier** → navigate vers `/admin/cv-templates/:id`
  - **Dupliquer** → INSERT avec `is_active: false` et nom "(copie)"
  - **Supprimer** → DELETE avec `confirm()`
- Bouton "Nouveau template" → navigate vers `/admin/cv-templates/new`

**Problèmes actuels identifiés :**
- Pas de tri/filtre sur actifs/inactifs
- Pas de preview canvas rendu dans la liste (thumbnail statique seulement)

---

### 1.2 Éditeur canvas — `AdminCVTemplateBuilder.tsx`

**Route :** `/admin/cv-templates/:templateId` (aussi `new`)

#### Structure UI : 3 colonnes

```
┌──────────────┬──────────────────────────┬────────────────┐
│  GAUCHE      │         CENTRE           │    DROITE      │
│  (192px)     │     Canvas A4            │    (224px)     │
│              │     595×842 px           │                │
│  Sections CV │                          │  Propriétés    │
│  (clic pour  │  [éléments positionnés   │  de l'élément  │
│  ajouter)    │   en absolu]             │  sélectionné   │
│              │                          │                │
│  Calques     │                          │  OU config     │
│  (liste      │                          │  canvas global │
│  inverse)    │                          │                │
└──────────────┴──────────────────────────┴────────────────┘
```

#### Toolbar (header)

| Bouton | Action |
|--------|--------|
| ← Retour | Navigate `/admin/cv-templates` |
| Nom | Input éditable (templateName) |
| Texte | Ajoute un `type:"text"` à x=50, y=50 |
| Forme pleine | Ajoute un `type:"shape"` rempli |
| Forme vide | Ajoute un `type:"shape"` bordure |
| Ligne | Ajoute un `type:"divider"` full-width |
| **Importer PDF IA** | Upload PDF → edge fn `ai-template-from-pdf` (Gemini Vision) |
| **Importer HTML** | Upload `.html` → parseur DOM iframe client-side |
| Dupliquer (si sélection) | Clone + offset 15px |
| Avant / Arrière (si sélection) | Réordonne dans le tableau `elements[]` |
| Supprimer (si sélection) | Supprime si non locked |
| Annuler | Navigate retour |
| **Sauvegarder** | `INSERT/UPDATE cv_templates` avec JSON canvas-v2 |

#### Types d'éléments (`ElementType`)

| Type | Comportement |
|------|-------------|
| `"text"` | Texte libre, double-clic pour éditer (contentEditable) |
| `"shape"` | Rectangle décoratif (fond plein ou bordure) |
| `"divider"` | Ligne horizontale de séparation |
| `"image"` | Placeholder photo (gris + icône User + label "Photo profil" dans l'admin) |
| `"cv-section"` | Bloc de données CV dynamique (sectionId obligatoire) |

#### Sections CV disponibles (`SectionId`)

| SectionId | Label | Placeholder montré dans le canvas |
|-----------|-------|-----------------------------------|
| `contact` | Coordonnées | Jean Dupont + email + téléphone |
| `summary` | Résumé/Bio | Texte de profil fictif |
| `experiences` | Expériences | 2 postes fictifs |
| `skills` | Compétences | Badges React, TypeScript... |
| `education` | Formations | 2 diplômes fictifs |
| `target_jobs` | Métiers cherchés | Texte fictif |
| `entrepreneurship` | Entrepreneuriat | 1 projet fictif |
| `languages` | Langues | 3 langues fictives |

**Règle :** une section ne peut apparaître qu'une seule fois — si elle existe déjà, toast "Section déjà présente".

#### Interactions canvas

- **Clic** sur un élément → sélection (outline bleu)
- **Drag** sur un élément → déplacement (mousedown + mousemove global)
- **Handles** (8 poignées) → resize en 8 directions (n/s/e/w/ne/nw/se/sw)
- **Double-clic** sur `text` → mode édition contentEditable
- **Clic en dehors** → désélectionner + quitter édition texte
- **Delete/Backspace** (keyboard) → supprime l'élément sélectionné si non locked
- **Ctrl+D** → duplique l'élément sélectionné

#### Panneau droite — Propriétés de l'élément sélectionné

- **Position & Taille** : X, Y, Largeur, Hauteur (NumInput)
- **Couleurs** : Fond (tous), Texte (text + cv-section)
- **Typographie** : Police, Taille, Hauteur de ligne, Espacement, Padding, Gras/Italique, Alignement
- **Bordure & Forme** : Radius, Style (none/solid/dashed/dotted), Couleur, Épaisseur
- **Opacité** : slider 0→100%
- **Boutons** : Verrouiller/Déverrouiller, Masquer/Afficher, Dupliquer, Ordre ↑/↓, Supprimer

#### Panneau droite — État sans sélection (config canvas)

- **Fond du canvas** : ColorInput
- **Police globale** : select (Helvetica, Georgia, Garamond, Courier, Verdana, Trebuchet)
- **Toggle "Template avec photo"** : bascule `has_photo` sur le CanvasConfig
- **Image de couverture (thumbnail)** : upload vers bucket `cms-media/cv-templates/thumb-*.ext` → URL stockée dans `thumbnail_url`

#### Panneau gauche

- **Sections CV** : clic → `addSection(sectionId)`. Les sections déjà placées montrent un point bleu + fond primary/5
- **Calques** : liste inversée (dernier = haut), clic → sélectionner. Badge cadenas si locked.

---

### 1.3 Import PDF IA (`handleImportPDF`)

1. Lit le fichier en base64
2. Appelle edge function `ai-template-from-pdf` via `supabase.functions.invoke`
3. Gemini Vision analyse le design visuel
4. Reçoit un `CanvasConfig` canvas-v2 complet
5. `setConfig(result.config)` → remplace tout le canvas

**Limites :** max 10 MB, overlay "Analyse IA..." pendant 15-30s, positions estimées (pas toujours exactes)

---

### 1.4 Import HTML DOM (`handleImportHTML`)

1. Lit le fichier HTML comme texte
2. Crée un `<iframe>` caché (794×1123px = A4 à 96dpi) via `srcdoc`
3. Attend `onload` + 500ms (rendu CSS complet)
4. Calcule l'origine sur `.cv-page` ou `body`
5. Pour chaque élément DOM détecté :
   - `img.photo` → élément `"image"` avec `content="[PHOTO]"`
   - `.header-content` / `header` → `cv-section "contact"`
   - `.profile-summary` → `cv-section "summary"`
   - Chaque `<section>` avec `<h2>` → mapping regex → `cv-section`
   - `h2` avec `border-bottom` CSS → `divider` juste sous le h2
   - `.footer-grid` → `cv-section "languages"` (fallback)
6. Scale : `SCALE_X = 595/794 ≈ 0.749`, `SCALE_Y = 842/1123 ≈ 0.749`
7. Extrait `backgroundColor` du `.cv-page` et `fontFamily` du `body`
8. `setConfig(...)` avec positions DOM exactes
9. Cleanup : `removeChild(iframe)`

**Mapping regex :**

| Pattern | → SectionId |
|---------|-------------|
| `expériences?` / `professional` / `work exp` | `experiences` |
| `entrepreneuri` / `parcours entrepren` | `entrepreneurship` |
| `compétences?` / `skills?` | `skills` |
| `formations?` / `certifications?` / `education` | `education` |
| `métiers?` / `objectifs? pro` | `target_jobs` |
| `langues?` / `soft skills?` | `languages` |

---

### 1.5 Sauvegarde (`saveMutation`)

```
CanvasConfig (objet JS)
  → JSON.stringify(config)
  → stocké dans cv_templates.html_template (champ TEXT)
  → avec : name, css_styles: "", sector: "custom", is_active: true, thumbnail_url
```

---

## PARTIE 2 — Lien Admin → Utilisateur (table `cv_templates`)

### Structure de la table

| Colonne | Type | Usage |
|---------|------|-------|
| `id` | UUID | Identifiant unique |
| `name` | TEXT | Nom affiché dans la galerie |
| `html_template` | TEXT | JSON canvas-v2 **OU** HTML legacy |
| `css_styles` | TEXT | Vide pour canvas-v2 |
| `sector` | TEXT | "custom" (non utilisé côté user actuellement) |
| `is_active` | BOOLEAN | **Seuls les `true` sont visibles côté user** |
| `thumbnail_url` | TEXT | URL image de couverture (depuis bucket cms-media) |
| `has_photo` | N/A | **Pas une colonne DB** — extrait de `html_template` JSON à la volée |

**Point critique :** `has_photo` n'est pas une colonne en BDD. CVBuilder le lit en parsant `html_template` pour chaque template lors du chargement.

### Format JSON canvas-v2 (stocké dans `html_template`)

```json
{
  "version": "canvas-v2",
  "canvasWidth": 595,
  "canvasHeight": 842,
  "backgroundColor": "#ffffff",
  "fontFamily": "Helvetica, Arial, sans-serif",
  "has_photo": false,
  "elements": [
    {
      "id": "el-uuid",
      "type": "cv-section",
      "sectionId": "contact",
      "x": 0, "y": 0,
      "width": 595, "height": 120,
      "visible": true,
      "locked": false,
      "styles": {
        "backgroundColor": "#0f1b3d",
        "color": "#ffffff",
        "fontSize": 10,
        "fontFamily": "Helvetica",
        "padding": 20,
        "opacity": 1
      }
    }
  ]
}
```

---

## PARTIE 3 — Côté Utilisateur : CVBuilder

### 3.1 Étape 1 : Sélection du template (`step === "select"`)

**Route :** `/cv-builder`

**Chargement des templates :**
```
supabase → cv_templates
  WHERE is_active = true
  ORDER BY created_at DESC
  → parse html_template JSON pour extraire has_photo
```

**Filtres disponibles :**
- Boutons "Tous / Avec photo / Sans photo" → filtre sur `has_photo`
- Les 3 premiers = "Recommandés", le reste masqué derrière "Voir tous nos modèles"

**Comportement des cartes :**
- Clic → sélectionne ET navigue immédiatement vers l'éditeur (`handleContinue`)
- Hover → overlay sombre + bouton "Choisir ce modèle"
- Nom de l'utilisateur s'affiche en temps réel sur la miniature (si firstName/lastName saisis)

**Palettes de couleurs :** 6 palettes (Violet, Vert, Bleu, Ardoise, Rouge, Orange) → modifient `primaryColor`, `accentColor`, `textColor` des `designOptions`

---

### 3.2 Étape 2 : Éditeur `CVBuilderEditor.tsx`

**Layout 3 colonnes (XL) :**

```
┌──────────────┬──────────────────────────┬────────────────┐
│  Sidebar     │         Main             │    Preview     │
│  gauche      │         Content          │    droite      │
│  (280-320px) │                          │    (360px)     │
│              │                          │   visible xl+  │
│  Logo        │  Sticky top bar          │                │
│  Stepper 6   │  (progression)           │  CVPreview     │
│  étapes      │                          │  scale 0.423   │
│              │  Contenu de l'étape      │  (794→336px)   │
│  Import CV   │                          │                │
│  (PDF/DOCX   │  Sticky bottom nav       │                │
│  /TXT/BDD)   │  (Précédent/Continuer)   │                │
└──────────────┴──────────────────────────┴────────────────┘
```

**Les 6 étapes du stepper :**

| Étape | Contenu saisi |
|-------|--------------|
| `contact` | firstName, lastName, title, email, phone, address, linkedin |
| `profile` | summary (résumé), targetJobs |
| `experience` | company, role, dates, bullets[] (+ ajout/suppression) |
| `education` | school, degree, dates (+ ajout/suppression) |
| `skills` | technical[], soft[] (suggestions cliquables) |
| `finalize` | Aperçu + bouton Sauvegarder |

**Import CV existant (sidebar gauche) :**
- Upload PDF/DOCX/TXT → edge fn `parse-cv-document` → edge fn `generate-cv-content` → remplit `cvData`
- Chargement depuis BDD → `user_generated_cvs` → `generate-cv-content`

---

### 3.3 Preview temps réel : `CVPreview.tsx`

**Double rôle** (prop `standalone`) :

| `standalone` | Contexte | Comportement |
|---|---|---|
| `true` (défaut) | Page CVScorePage ou standalone | Affiche header "Aperçu A4" + bouton Imprimer + scale 0.7 interne |
| `false` | Sidebar de CVBuilderEditor | Pas de header, pas de scale interne, utilisé avec scale 0.423 externe |

**Résolution du templateId :**
1. Si UUID valide → charge depuis `cv_templates` WHERE id = templateId
2. Parse `html_template` JSON → si `version === "canvas-v2"` → `DynamicCVRenderer` en mode canvas
3. Si legacy ID (classic/dark/light/geo/modern/minimal) → composant React hardcodé

**Adaptateur `adaptCVData` :** convertit le format `CVData` du builder vers le format `DynamicCVRenderer.CVData`

---

### 3.4 Rendu final : `DynamicCVRenderer.tsx`

**Type guard :** `isCanvasConfig(c)` → vérifie `version === "canvas-v2"` ET `Array.isArray(elements)`

**Mode canvas-v2 :** Div 595×842px, position relative, background du canvas. Pour chaque élément :

| Type | Rendu |
|------|-------|
| `text` | div avec styles CSS + contenu (whiteSpace pre-wrap) |
| `shape` | div avec backgroundColor + borderRadius + border |
| `divider` | div avec backgroundColor (h=2px typiquement) |
| `image` | Si `content="[PHOTO]"` + photoUrl → `<img>` avec la photo utilisateur. Sans photo → div transparent invisible |
| `cv-section` | Appelle `renderSection()` avec `accentColor` des designOptions utilisateur |

**Props disponibles :**

```typescript
interface DynamicCVRendererProps {
  config: AnyConfig;
  cvData: CVData;
  scale?: number;
  photoUrl?: string;       // Photo de l'utilisateur
  primaryColor?: string;   // Couleur principale (palette)
  accentColor?: string;    // Couleur d'accent (palette) → appliquée aux titres de section
}
```

**Mode legacy :** Rendu flexbox avec sidebar/main selon `TemplateConfig.layout`

---

### 3.5 Sauvegarde utilisateur (`handleSaveCV`)

```
user_generated_cvs.INSERT({
  user_id,
  name: "CV - Prénom Nom",
  cv_data: cvData,        ← toutes les données saisies
  template_id: templateId ← UUID du template canvas-v2 sélectionné
})
```

---

## PARTIE 4 — Chaîne complète de transmission des données

```
CVBuilder (step select)
  └── templateId (UUID)
  └── designOptions { primaryColor, accentColor, textColor, photoUrl }
         │
         ▼
  CVBuilderEditor
         │
         ▼
  CVPreview (standalone=false)
    └── CanvasTemplateRenderer (si UUID)
          └── supabase.from("cv_templates").select(...)
          └── JSON.parse(html_template) → CanvasConfig
                │
                ▼
          DynamicCVRenderer
            photoUrl    ← designOptions.photoUrl
            accentColor ← designOptions.accentColor
            primaryColor← designOptions.primaryColor
            cvData      ← adaptCVData(cvData)
```

---

## PARTIE 5 — Résumé des lacunes et statut de correction

| # | Problème | Impact | Statut |
|---|---------|--------|--------|
| 1 | `type:"image"` non rendu dans `DynamicCVRenderer` | Photo disparaît côté user | ✅ **Corrigé** |
| 2 | `designOptions` ignorés par canvas-v2 | Couleurs palette sans effet | ✅ **Corrigé** |
| 3 | `has_photo` extrait à la volée depuis JSON (pas colonne BDD) | Fragile, pas indexable | ⚠️ À corriger |
| 4 | Import HTML : `getBoundingClientRect()` peut donner 0 si pas de `.cv-page` | Sections mal positionnées | ⚠️ Partiel |
| 5 | Thumbnail admin : upload manuel seulement | Pas de génération automatique | ⚠️ À corriger |
| 6 | Import HTML : contact absent si HTML non standard | Template incomplet | ⚠️ À corriger |

---

## PARTIE 6 — Fichiers clés du système

| Fichier | Rôle |
|---------|------|
| `src/pages/Admin/AdminCVTemplates.tsx` | Galerie admin (liste + CRUD) |
| `src/pages/Admin/AdminCVTemplateBuilder.tsx` | Éditeur canvas-v2 |
| `src/pages/CVBuilder.tsx` | Galerie + sélection template utilisateur |
| `src/components/cv-builder/CVBuilderEditor.tsx` | Éditeur 6 étapes utilisateur |
| `src/components/cv-builder/CVPreview.tsx` | Preview A4 temps réel + legacy templates |
| `src/components/cv-builder/DynamicCVRenderer.tsx` | Moteur de rendu canvas-v2 + legacy |
| `supabase/functions/ai-template-from-pdf/index.ts` | Edge fn : PDF → canvas-v2 via Gemini Vision |

---

*Document généré automatiquement depuis le codebase. À mettre à jour après chaque évolution majeure du système.*
