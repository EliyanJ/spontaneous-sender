
## Analyse complète avant le plan

### Ce que l'utilisateur veut

1. **Hiérarchie thématique → métier** : Une thématique (ex: "Gestion de projet") contient des métiers spécifiques (ex: "Scrum Master", "Product Owner", "PMO"). Chaque métier a ses mots-clés **propres** EN PLUS de la base commune de la thématique.

2. **L'IA détecte un nouveau métier** → elle le recatégorise automatiquement dans une thématique existante avec ses mots-clés spécifiques, pour soumission à la validation admin.

3. **Validation reste manuelle (admin + IA)** pour garder la visibilité.

### État actuel du code

La table `ats_professions` est plate : chaque ligne = une thématique OU un métier sans distinction. Il n'y a pas de relation parent-enfant. L'algo `analyze-cv-ats` sélectionne LA meilleure profession matchante et utilise ses `primary_keywords` directement.

### Architecture cible

```
ats_professions (hiérarchie)
├── Thématique: "Gestion de projet"  [is_theme=true, parent_theme_id=NULL]
│     primary_keywords: [planning, budget, stakeholders, risque...]
│     → mots communs à TOUS les métiers gestion de projet
│
├── Métier: "Scrum Master"           [is_theme=false, parent_theme_id=<gestion-projet-id>]
│     primary_keywords: [sprint, backlog, velocity, story, kanban, agile...]
│     → mots SPÉCIFIQUES Scrum Master
│
└── Métier: "PMO"                    [is_theme=false, parent_theme_id=<gestion-projet-id>]
      primary_keywords: [portefeuille, gouvernance, reporting, programme...]
      → mots SPÉCIFIQUES PMO
```

Lors du scoring : si un métier est sélectionné, on **fusionne** ses mots-clés avec ceux de sa thématique parente → base thématique + spécificité métier.

### Nouveau mode IA : détection d'un nouveau métier inconnu

Quand `analyze-cv-ats` ne trouve pas de match profession au-dessus d'un seuil minimum (score = 0 ou très faible), l'IA peut :
1. Analyser l'intitulé de poste + la description
2. Proposer : "Ce poste ressemble à un nouveau métier. Thématique probable : X. Mots-clés spécifiques détectés : [...]"
3. Créer un enregistrement en attente dans `ats_professions` avec `status = 'pending_review'`
4. L'admin voit les nouveaux métiers proposés dans l'onglet "Thématiques" avec un badge "Nouveau à valider"

---

## Plan d'implémentation

### Étape 1 — Migration base de données

Ajouter à `ats_professions` :
- `parent_theme_id uuid REFERENCES ats_professions(id)` — si NULL = c'est une thématique racine
- `is_theme boolean DEFAULT false` — distingue thématique vs métier
- `status text DEFAULT 'active'` — values: `active`, `pending_review` — pour les métiers proposés par l'IA

### Étape 2 — Edge function `analyze-cv-ats` — fusion thématique + métier

Modifier l'ÉTAPE 4 du scoring pour :
1. Si le meilleur match est un **métier** (is_theme=false, parent_theme_id non null), charger aussi la thématique parente
2. Fusionner les keywords : `primary = [...theme.primary_keywords, ...metier.primary_keywords]`
3. Si aucun match ≥ seuil minimum (score < 5), déclencher une détection "nouveau métier inconnu" → sauvegarder dans `cv_analyses` un flag `needs_profession_suggestion = true`

### Étape 3 — Edge function `ats-ai-review` — nouveau mode `suggest_profession`

Ajouter un mode `suggest_profession` :
- Input : `job_title`, `job_description`, liste des thématiques existantes
- Output : `{ suggested_theme: string, suggested_job_name: string, specific_keywords: { primary: [], soft_skill: [] }, confidence: number }`
- Ce mode est appelé depuis l'admin quand on clique "Analyser" sur une analyse sans profession identifiée

### Étape 4 — Admin `AdminATSTraining.tsx`

**Onglet Thématiques** :
- Afficher les thématiques en accordéon : thématique racine → liste des métiers enfants en dessous avec leur nombre de mots-clés propres
- Badge "🆕 À valider" sur les métiers avec `status = 'pending_review'` (proposés par l'IA)
- Bouton "Créer un métier" dans une thématique → ouvre l'éditeur de thème avec `parent_theme_id` pré-rempli
- Dans l'éditeur : si c'est un métier, afficher les mots-clés hérités de la thématique parente en lecture seule (grisés) + les mots-clés propres au métier (éditables)

**Onglet Analyses** :
- Pour les analyses sans profession identifiée, ajouter un bouton "🤖 Suggérer un métier IA" qui appelle le mode `suggest_profession`
- La suggestion s'affiche avec un formulaire de validation : confirmer le nom du métier, la thématique parente, et les mots-clés → bouton "Créer ce métier"

**Nouveaux métiers proposés par IA** (section dans l'onglet Thématiques) :
- Card spéciale listant les `pending_review` avec options : Valider / Modifier / Rejeter

---

## Fichiers à modifier

| Fichier | Changement |
|---|---|
| Migration SQL | Ajouter `parent_theme_id`, `is_theme`, `status` à `ats_professions` |
| `supabase/functions/analyze-cv-ats/index.ts` | Fusion thématique+métier au scoring, flag métier inconnu |
| `supabase/functions/ats-ai-review/index.ts` | Nouveau mode `suggest_profession` |
| `src/pages/Admin/AdminATSTraining.tsx` | Accordéon thématique/métiers, validation des propositions IA, éditeur avec héritage |

---

## Ce que ça change concrètement

- Un CV "Scrum Master" sera scoré sur les mots-clés Scrum Master (spécifiques) + les mots-clés Gestion de projet (communs) — beaucoup plus précis
- Si l'IA rencontre un poste "Revenue Operations Manager" inconnu, elle le propose comme nouveau métier dans "Commercial / Revenue" avec ses mots-clés — tu valides, et le prochain CV similaire sera scoré correctement
- La base s'enrichit **automatiquement** par les soumissions des utilisateurs, mais **tu gardes la validation** pour contrôler la qualité
