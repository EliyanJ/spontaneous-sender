
# Ajout de templates multiples + personnalisation design + photo de profil

## Vue d'ensemble de l'image de référence

L'image montre 4 templates distincts :
1. **Classique** - Fond blanc, sidebar gauche bleu foncé avec photo ronde, contenu à droite
2. **Sombre** - Fond noir total, sidebar gauche noire, accent vert/doré
3. **Clair bicolore** - Header vert clair, fond blanc, accents verts
4. **Géométrique** - Header avec formes géométriques grises, photo carrée en haut à droite

## Ce qui change

### 1. `src/lib/cv-templates.ts` — Ajout de 4 templates + `CVDesignOptions`

Ajouter une interface `CVDesignOptions` :
```ts
interface CVDesignOptions {
  primaryColor: string;    // couleur header/sections
  textColor: string;       // couleur texte principal
  accentColor: string;     // couleur titres, accents
  photoUrl?: string;       // base64 ou URL de la photo
}
```

Ajouter 4 templates avec des structures HTML distinctes (pas juste du CSS différent) :
- **Classique** (actuel finance, sidebar gauche bleue + photo ronde)
- **Sombre** (fond noir, sidebar + accent clair)
- **Clair** (header coloré léger, fond blanc)
- **Géométrique** (header avec formes, accent géométrique)

Chaque template expose une fonction `render(cvData, designOptions)` qui retourne le JSX/HTML.

### 2. `src/pages/CVBuilder.tsx` — Sélecteur de template + panneau design

Dans le panneau gauche, ajouter **au-dessus** du sélecteur de secteur :

**Sélecteur de templates** : grille 2×2 de miniatures cliquables (petites previews SVG/div stylisées) avec le nom dessous. Template actif surligné avec anneau de couleur primary.

**Panneau de personnalisation** (accordéon ou section inline sous le sélecteur de template) :
- Couleur principale (header/fond sections) → `<input type="color" />`
- Couleur du texte → `<input type="color" />`
- Couleur accent → `<input type="color" />`
- Upload photo → zone cliquable small avec preview

### 3. `src/components/cv-builder/CVPreview.tsx` — Rendu multi-template

- Accepter `templateId`, `designOptions` et `photoUrl` en props
- Chaque template a sa propre structure JSX dans `CVPreview` (switch sur templateId)
- Les couleurs du CSS sont injectées via CSS variables ou style inline avec les valeurs de `designOptions`
- La photo est affichée dans le header si présente (img ronde ou carrée selon le template)

### 4. `src/components/cv-builder/CVBuilderForm.tsx`

- Ajouter un champ "Photo de profil" dans la section Informations personnelles
  - Input file `accept="image/*"` → converti en base64 → stocké dans `designOptions.photoUrl`

## Nouveaux props transmis

```text
CVBuilder (state) ──► CVPreview
  templateId: "classic" | "dark" | "light" | "geo"
  designOptions: { primaryColor, textColor, accentColor, photoUrl }

CVBuilder (state) ──► CVBuilderForm
  designOptions + onDesignChange
  (pour l'upload photo dans les infos perso)
```

## Fichiers modifiés

| Fichier | Action |
|---------|--------|
| `src/lib/cv-templates.ts` | Ajouter 3 nouveaux templates + interface `CVDesignOptions` + couleurs par défaut par template |
| `src/pages/CVBuilder.tsx` | Ajouter state `templateId` + `designOptions`, grille sélecteur de templates, panneau couleurs |
| `src/components/cv-builder/CVPreview.tsx` | Rendu conditionnel par template, injection des couleurs custom, affichage photo |
| `src/components/cv-builder/CVBuilderForm.tsx` | Ajout upload photo dans infos perso |
