
# Plan complet

## Deux livrables

1. **Fichier rapport** `public/cv-template-developer-guide.md` — documentation exhaustive pour toute IA ou développeur qui crée un nouveau template
2. **Fonctionnalité UX** — popup de validation lors du parsing d'un CV importé, quand l'IA détecte du texte dépassant les limites

---

## Livrable 1 — Rapport technique

Le fichier couvrira :

### Architecture globale (flux de données)
```text
CV importé (PDF/DOCX)
    ↓ parse-cv-document (Edge Function — extraction texte brut)
    ↓ generate-cv-content (Edge Function — Gemini → JSON CVData)
    ↓ CVData (TypeScript, src/lib/cv-templates.ts)
    ↓ adaptCVDataForTemplate() (src/lib/cv-templates/adaptCVDataForTemplate.ts)
    ↓ TemplateCVData (format plat avec tous les champs)
    ↓ injectCVData() (src/lib/cv-templates/injectCVData.ts)
    ↓ HTML rendu (DOM parser, data-attributes)
    ↓ HTMLCVRenderer (iframe isolé, scale 0.348 dans le builder)
    ↓ Aperçu temps réel (droite du builder) + Admin preview
```

### Les deux types de template
- **Legacy (React JSX)** : ClassicTemplate, DarkTemplate, etc. dans `CVPreview.tsx` — hardcodés en JSX, pas de data-field, format `CVData` direct. Ne pas utiliser pour les nouveaux templates.
- **html-v1 (nouveau système)** : fichier `.html` avec balises `data-*`, stocké en BDD dans `cv_templates.html_template`. C'est le seul système à utiliser maintenant.

### Table de correspondance CVData → TemplateCVData
Tableau complet de toutes les conversions opérées par `adaptCVDataForTemplate.ts`

### Référence complète des balises data-*

Toutes les balises avec exemples HTML concrets :

| Attribut | Rôle | Exemple HTML |
|---|---|---|
| `data-field="id"` | Champ texte simple | `<span data-field="full_name">Prénom Nom</span>` |
| `data-field-img="id"` | Image (src) | `<img data-field-img="photo" />` |
| `data-section="id"` | Section masquée si vide | `<section data-section="skills">` |
| `data-list="id"` | Conteneur répétable | `<div data-list="experiences">` |
| `data-bullet-list="id"` | Liste `<ul>` dynamique | `<ul data-bullet-list="bullets">` |

### Tous les champs disponibles (avec limites de caractères)
Tableau exhaustif :

| Champ `data-field` | Source dans CVData | Limite recommandée | Notes |
|---|---|---|---|
| `full_name` | firstName + lastName | 40 car. | —  |
| `main_title` | personalInfo.title | 60 car. | Majuscules recommandées |
| `sub_titles` | targetJobs | 80 car. | Optionnel |
| `phone` | personalInfo.phone | 20 car. | — |
| `email` | personalInfo.email | 45 car. | — |
| `location` | personalInfo.address | 40 car. | — |
| `linkedin` | personalInfo.linkedin | 50 car. | — |
| `summary` | summary | **400 car. max** | Limité côté UI |
| `photo` | designOptions.photoUrl | — | data-field-img |
| `languages_content` | langues + soft skills | 120 car. | Chaîne formatée |
| `interests_content` | interests[] | 80 car. | Chaîne formatée |

### Structure des listes répétables

**`data-list="experiences"`** — item requis :
```html
<div data-list="experiences">
  <div class="item">
    <div data-field="title">Entreprise - Poste</div>  <!-- max 60 car -->
    <div data-field="date">2022 - 2025</div>           <!-- max 20 car -->
    <ul data-bullet-list="bullets">
      <li>Réalisation</li>                              <!-- max 90 car/bullet, max 4 bullets -->
    </ul>
  </div>
</div>
```

**`data-list="skills"`** — item compatible double format :
```html
<div data-list="skills">
  <!-- Format 1 (simple, recommandé) -->
  <span class="skill-item" data-field="skill_name">Compétence</span>
  <!-- OU Format 2 (compatibilité) -->
  <span class="skill-item" data-field="name">Compétence</span>
</div>
```

**`data-list="education"`** :
```html
<div data-list="education">
  <div class="edu-item">
    <div data-field="date">2018 - 2020</div>
    <div data-field="label">Master Finance - HEC</div>  <!-- max 70 car -->
  </div>
</div>
```

### Contraintes CSS obligatoires
Règles CSS que chaque template DOIT respecter :
```css
/* OBLIGATOIRE — structure de page */
.cv-page {
  width: 210mm;
  min-height: 297mm;
  max-height: 297mm; /* CRITIQUE : pas de débordement */
  background: white;
  margin: 0 auto;
  padding: 30px 40px;
  box-sizing: border-box;
  overflow: hidden;   /* CRITIQUE */
  max-width: 100%;
}

/* OBLIGATOIRE — masquage des champs vides */
[data-hidden="true"] {
  display: none !important;
  margin: 0 !important;
  padding: 0 !important;
  line-height: 0 !important;
  height: 0 !important;
}

/* Compétences — grille recommandée */
.skills-container {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1px 10px;
}
.skill-item {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 11px;
  line-height: 1.3;
}
```

### Limites de contenu A4

```text
Résumé/Accroche :     max 400 car. (forcé via maxLength dans le form)
Titre du poste :      max 60 car.
Bullet expérience :   max 90 car. / max 4 bullets par expérience
Expériences :         max 3 recommandé (4 si courtes)
Formations :          max 3
Compétences :         max 16 (grille 4×4)
Langues/intérêts :    max 120 car. pour languages_content
```

### Template de base minimal (complet et fonctionnel)
Fourni dans le rapport, copier-coller prêt à l'emploi.

### Erreurs courantes et comment les éviter
- `data-field="name"` vs `data-field="skill_name"` → les deux sont supportés maintenant
- Oublier `data-bullet-list="bullets"` dans les expériences → les réalisations ne s'affichent pas
- Pas de `data-section` → la section reste visible même si elle est vide
- CSS avec `overflow: visible` → le contenu dépasse hors du A4
- `font-size` trop grand → texte coupe hors page, utiliser 10-13px max

---

## Livrable 2 — Popup de validation textes trop longs

### Principe UX
Après que `generate-cv-content` retourne le `cvData` parsé depuis le CV importé, une fonction de validation analyse chaque champ par rapport aux limites connues. Si au moins un champ dépasse, on intercepte avant de mettre à jour le state et on affiche une Dialog :

```text
┌─────────────────────────────────────────────┐
│ ✂️ Contenu raccourci par l'IA               │
│                                             │
│ Certains passages sont trop longs pour      │
│ respecter le format A4. L'IA propose :      │
│                                             │
│ ▸ Accroche (412 → 400 car.)                │
│   "Diplômé d'HEC Paris avec 5 ans d'expér..." │
│   ┌──────────────────────────────┐           │
│   │ ✓ Accepter la suggestion IA │           │
│   └──────────────────────────────┘           │
│   [ou écrire moi-même...]                   │
│                                             │
│ ▸ Bullet exp. 1 / réalisation 2 (97 → 90)  │
│   "Augmentation du CA de 35% en 8 mois..."  │
│   ┌──────────────────────────────┐           │
│   │ ✓ Accepter la suggestion IA │           │
│   └──────────────────────────────┘           │
│   [ou écrire moi-même...]                   │
│                                             │
│        [Tout accepter]  [Tout revoir]       │
└─────────────────────────────────────────────┘
```

### Implémentation

**Étape 1** — Nouvelle function `validateAndTruncateCVData` dans `src/lib/cv-export/cvDataValidator.ts` :
- Parcourt tous les champs du `CVData` retourné par l'IA
- Pour chaque dépassement, génère un objet `{ field, original, suggested, exceeded }` 
- La suggestion = simple truncation à la limite + "..." OU appel AI pour reformuler (à décider)
- Pour l'itération 1 : truncation intelligente (coupure à la dernière phrase complète)

**Étape 2** — Nouveau composant `CVTruncationDialog.tsx` dans `src/components/cv-builder/` :
- Dialog avec liste des champs dépassant la limite
- Pour chaque : affiche original vs suggestion, bouton "Accepter" ou textarea pour réécrire
- Bouton "Tout accepter" et "Confirmer mes modifications"

**Étape 3** — Intégration dans `CVBuilder.tsx` :
- Dans `generateFromText`, après le parse de `data.cvData`, appeler `validateAndTruncateCVData`
- Si des violations → stocker dans un state `pendingViolations` → ouvrir la dialog
- Quand l'utilisateur valide → appliquer les corrections → appeler `setCvData`

### Fichiers à créer/modifier

```text
CRÉER  src/lib/cv-export/cvDataValidator.ts
CRÉER  src/components/cv-builder/CVTruncationDialog.tsx
ÉDITER src/pages/CVBuilder.tsx
         → intercepter le résultat de generateFromText
         → ajouter state pendingViolations + pendingCvData
         → ouvrir CVTruncationDialog si violations
```

### Limites validées (constantes partagées)

```ts
export const CV_FIELD_LIMITS = {
  summary: 400,
  full_name: 40,
  main_title: 60,
  location: 40,
  bullet: 90,         // par bullet d'expérience
  exp_title: 60,      // company + role concaténés
  edu_label: 70,      // degree + school concaténés
  languages_content: 120,
  interests_content: 80,
  max_bullets_per_exp: 4,
  max_skills: 16,
} as const;
```
