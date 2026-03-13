
## Diagnostic précis

La cause racine est un **mismatch de nom de champ** entre deux couches :

**Template HTML en BDD** (template `Test_fonctionnel_1`) :
```html
<div class="skill-item" data-field="name">Compétence</div>
```

**Ce que `adaptCVDataForTemplate.ts` produit** :
```js
{ skill_name: "Excel", detail_1: "Excel", detail_2: "", detail_3: "" }
```

Le moteur `injectCVData` cherche un enfant avec `data-field="skill_name"` ou `data-field="name"` — mais le template dit `name`, et les données ont `skill_name`. Aucune valeur ne correspond → les compétences restent vides.

**Double problème** :
1. Le template en BDD a `data-field="name"` (ancien format)
2. Le code produit un objet avec `skill_name` mais pas `name`

## Solution

### Option A — Fix dans le code (le plus propre)
Dans `adaptCVDataForTemplate.ts`, ajouter `name: skill` en plus de `skill_name: skill` dans chaque item skills. Ainsi le champ `name` est présent pour les anciens templates, et `skill_name` pour le DEFAULT_TEMPLATE_HTML du builder admin.

```ts
// Dans formatSkillsForTemplate
.map((skill) => ({
  category: "",
  name: skill,        // ← AJOUT pour compatibilité templates BDD avec data-field="name"
  skill_name: skill,  // ← déjà présent
  detail_1: skill,
  detail_2: "",
  detail_3: "",
}));
```

### Option B — Mettre à jour le template en BDD
Modifier le `html_template` en BDD pour remplacer `data-field="name"` par `data-field="skill_name"`.

**Choisir Option A** — c'est la plus résiliente : elle corrige **tous** les templates existants sans toucher la BDD, et préserve la rétrocompatibilité. Une seule ligne à changer dans `adaptCVDataForTemplate.ts`.

## Fichier impacté

```text
src/lib/cv-templates/adaptCVDataForTemplate.ts
  → Ajouter name: skill dans le map des skills
    (1 ligne)
```

C'est tout. Le fix est chirurgical — une seule propriété manquante dans l'objet de données.
