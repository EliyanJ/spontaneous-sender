
## Analyse de l'existant

L'`AdminCVTemplateBuilder` est actuellement un layout **2 colonnes** : panneau gauche (éditeur HTML + upload) et panneau droit (preview A4). Le but est de transformer le panneau droit en **3 onglets** : Aperçu, Contraintes, Design, + un 4e onglet Chat IA.

Le schéma du template est déjà extrait via `extractSchema()` qui retourne `{ fields, lists, sections, hasPhoto }`. On a donc accès à toutes les sections dynamiquement.

La table `cv_templates` a une colonne `template_schema` (jsonb) — on peut y stocker les contraintes personnalisées et les variables CSS.

---

## Architecture de la solution

### Transformation du panneau droit

```text
AVANT                          APRÈS
┌─────────────────────┐       ┌─────────────────────────────────────────┐
│                     │       │  [👁 Aperçu] [📏 Contraintes] [🎨 Design] [🤖 IA]  │
│    Preview A4       │       ├─────────────────────────────────────────┤
│                     │       │                                         │
│                     │       │  (contenu selon onglet actif)           │
│                     │       │                                         │
└─────────────────────┘       └─────────────────────────────────────────┘
```

### Onglet 1 — Aperçu (existant, déplacé)
Identique à l'aperçu actuel, rien ne change.

### Onglet 2 — Contraintes par section
Pour chaque section détectée par `extractSchema()`, afficher un bloc configurable :

```text
Section : experiences
  ├── Titre de l'expérience (data-field="title") → max X car. [input number]
  ├── Date (data-field="date")                   → max X car. [input number]
  ├── Bullet (data-bullet-list="bullets")         → max X car. par bullet [input number]
  ├── Nb max de bullets par expérience            → [input number]
  └── Nb max d'expériences                        → [input number]

Section : skills
  ├── Compétence (data-field="skill_name")        → max X car. [input number]
  └── Nb max de compétences                       → [input number]

Champ : summary
  └── Résumé                                      → max X car. [input number]
```

Ces contraintes sont stockées dans un objet `field_constraints` (JSON) dans la colonne `template_schema` de `cv_templates`.

Structure :
```ts
interface FieldConstraints {
  [fieldIdOrListId: string]: {
    maxChars?: number;
    maxLines?: number;
    maxItems?: number;         // pour les listes
    maxBulletsPerItem?: number; // pour les expériences
  }
}
```

### Onglet 3 — Design (couleurs + polices)
Détection automatique des variables CSS utilisables dans le template HTML.

On injecte dans le `<style>` du template des **variables CSS** standard :
- `--color-header-bg` → fond de l'en-tête
- `--color-primary` → couleur des titres h2 + bordures
- `--color-text` → couleur du texte courant
- `--color-accent` → couleur des éléments graphiques (barres, puces)
- `--font-main` → police principale

L'admin modifie ces valeurs via **color pickers et select font**. A chaque changement, on remplace le bloc des variables CSS dans le `htmlContent` en temps réel → la preview se met à jour instantanément.

Interface :
```text
┌─────────────────────────────────────────┐
│ 🎨 Design du template                   │
│                                         │
│ En-tête / fond haut    [████] #1A3C72   │
│ Titres de section      [████] #1A3C72   │
│ Texte courant          [████] #333333   │
│ Couleur d'accentuation [████] #C9A84C   │
│ Police d'écriture      [Inter      ▼]   │
│                                         │
│ [Réinitialiser] [Aperçu instantané ✓]   │
└─────────────────────────────────────────┘
```

Polices disponibles : Inter, Georgia, Arial, Montserrat, Roboto, Playfair Display, Lato.

L'injection des variables CSS dans le HTML se fait via une fonction `injectCSSVariables(html, vars)` qui insère ou remplace un bloc `/* cronos-design-vars */` dans le `<style>`.

### Onglet 4 — Chat IA Designer

Utilise l'edge function existante `chatbot-assistant` ou crée un appel direct au `LOVABLE_API_KEY` gateway.

Le système prompt IA est spécialisé :
- Connait la structure HTML du template actuel
- Pose des questions ciblées : "Quelle section voulez-vous modifier ?", "Quelle couleur pour les bordures ?"
- Génère des modifications CSS ou des remplacements de valeur dans le HTML
- Les modifications apparaissent comme un "diff" avec bouton **Appliquer** qui met à jour `htmlContent`

Flow :
```text
Admin → "Je veux changer le fond de l'en-tête en dégradé bleu violet"
IA    → "Je vais modifier la propriété background de .cv-header. 
         Proposition : linear-gradient(135deg, #1A3C72, #7C3AED)
         [Aperçu] [Appliquer] [Ignorer]"
```

L'IA reçoit en contexte système : le HTML complet + la liste des sections + les contraintes actuelles.

---

## Fichiers à créer / modifier

```text
MODIFIER  src/pages/Admin/AdminCVTemplateBuilder.tsx
            → Transformer le panneau droit en 4 onglets
            → Intégrer les 3 nouveaux composants

CRÉER     src/components/admin/template-builder/ConstraintsPanel.tsx
            → Interface de gestion des contraintes par section
            → Lit le schema extrait, génère les inputs

CRÉER     src/components/admin/template-builder/DesignPanel.tsx
            → Color pickers pour les 5 variables CSS
            → Select pour la police
            → Injection dans htmlContent en temps réel

CRÉER     src/components/admin/template-builder/AIDesignChat.tsx
            → Chat IA spécialisé design de template
            → Affiche les modifications proposées avec bouton Appliquer

CRÉER     src/lib/cv-templates/injectCSSVariables.ts
            → Fonction pure : injecte/remplace les variables CSS dans le HTML
```

### Données stockées

Les contraintes + variables design sont stockées dans `template_schema` (colonne jsonb existante) :

```json
{
  "fields": [...],
  "lists": [...],
  "sections": [...],
  "hasPhoto": true,
  "constraints": {
    "summary": { "maxChars": 400 },
    "experiences": { "maxItems": 3, "maxBulletsPerItem": 4, "bulletMaxChars": 90, "titleMaxChars": 60 },
    "skills": { "maxItems": 16, "skillMaxChars": 25 }
  },
  "designVars": {
    "--color-header-bg": "#1A3C72",
    "--color-primary": "#1A3C72",
    "--color-text": "#333333",
    "--color-accent": "#C9A84C",
    "--font-main": "Inter"
  }
}
```

Aucune migration BDD nécessaire — `template_schema` est déjà jsonb et accepte tout.

---

## Résumé des fichiers

| Fichier | Action | Complexité |
|---|---|---|
| `AdminCVTemplateBuilder.tsx` | Modifier — ajout onglets panneau droit | Moyenne |
| `ConstraintsPanel.tsx` | Créer | Moyenne |
| `DesignPanel.tsx` | Créer | Faible |
| `AIDesignChat.tsx` | Créer | Moyenne |
| `injectCSSVariables.ts` | Créer | Faible |

La sauvegarde des contraintes et des variables design se fait via le bouton "Sauvegarder" existant — elles sont incluses dans `template_schema` automatiquement.
