

## Analyse du HTML uploadé

Le CV HTML est :
- Format A4 pleine page (no sidebar) : `width: 210mm` = 595px, `min-height: 297mm` = 842px
- Padding 40px de chaque côté → zone contenu : x=40, width=515
- **Photo placeholder** : `<img class="photo" width=120 height=120>` en haut à gauche
- Sections détectées : header/contact → summary → experiences → entrepreneurship → skills (3 colonnes grid) → education → footer (langues + intérêts)
- Design sobre : fond blanc, texte noir, séparateurs `border-bottom: 2px solid #000`

## Ce qui existe déjà

L'éditeur canvas a déjà :
- Un bouton **"Importer PDF IA"** → edge function `ai-template-from-pdf` (Gemini Vision sur PDF)
- Le type `"image"` dans `ElementType` mais **pas rendu** dans le canvas (seuls text/shape/divider/cv-section le sont)
- La propriété `has_photo` sur `CanvasConfig`

## Ce qu'on va construire

### Nouvelle edge function `html-to-canvas-template`

Reçoit le contenu HTML brut (texte). Contrairement au PDF, le HTML donne des informations **précises** : couleurs CSS exactes, tailles, structure sémantique. L'IA n'a pas besoin de vision — elle lit le code directement.

Le prompt IA :
- Lit les blocs CSS pour extraire couleurs, fonts, spacings
- Lit la structure HTML pour mapper chaque `<section>` → `sectionId`
- Convertit les layouts relatifs (flexbox, grid, padding) en positions absolues sur canvas 595×842
- Détecte `<img class="photo">` → crée un `shape` gris avec label "Photo" comme placeholder positionné
- Retourne le JSON `canvas-v2` identique au format existant

### Modification `AdminCVTemplateBuilder.tsx`

Ajouter à côté du bouton "Importer PDF IA" :
- Un bouton **"Importer HTML"** (icône `Code2`)
- Un `<input type="file" accept=".html,.htm">` caché
- Un handler `handleImportHTML` qui lit le fichier comme texte et appelle la nouvelle edge function
- Même pattern que `handleImportPDF` (overlay "Analyse IA...", toast de confirmation)

### Rendu du bloc photo dans le canvas

Ajouter le rendu de `el.type === "image"` dans `renderCanvasElement` : affiche un rectangle gris avec icône `User` centré comme placeholder visuel (similaire à ce que l'admin voit pour signaler l'emplacement photo).

## Fichiers à modifier

| Fichier | Changement |
|---|---|
| `supabase/functions/html-to-canvas-template/index.ts` | **Nouvelle** edge function |
| `supabase/config.toml` | Enregistrer `[functions.html-to-canvas-template] verify_jwt = true` |
| `src/pages/Admin/AdminCVTemplateBuilder.tsx` | Bouton HTML + handler + rendu image type |

## Flux concret avec ce CV HTML

```
Admin clique "Importer HTML" → sélectionne CV_html_template_2.html
→ Edge fn lit le HTML/CSS :
   - header { display:flex } + .photo { 120x120 } → image element x=40, y=40, w=120, h=120
   - .header-content { flex:1 } → cv-section "contact" x=175, y=40, w=380, h=120
   - .profile-summary → cv-section "summary" x=40, y=175, w=515, h=60
   - <section> Expériences → cv-section "experiences" x=40, y=250, w=515, h=180
   - <section> Parcours Entrepreneurial → cv-section "entrepreneurship" x=40, y=445, w=515, h=90
   - .skills-container grid 3 cols → cv-section "skills" x=40, y=545, w=515, h=80
   - <section> Formations → cv-section "education" x=40, y=635, w=515, h=90
   - .footer-grid grid 2 cols → cv-section "languages" x=40, y=735, w=515, h=70
   - Séparateurs h2 → divider elements (border-bottom #000 2px)
   - has_photo: true
→ Canvas rempli avec les éléments positionnés
→ L'admin peut déplacer, redimensionner, changer les couleurs
→ Sauvegarde → disponible pour les utilisateurs
```

