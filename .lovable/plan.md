
## Analyse complète

### Questions de l'utilisateur — 4 points distincts

**1. Aperçu en haut à droite visible en grand écran**
Le panel droit `aside` (ligne 890) est `hidden xl:flex` → il n'apparaît qu'à partir de 1280px. Sur l'écran 954px de l'utilisateur (`xl` = 1280px), il est **invisible**. Solution : baisser le breakpoint à `lg` (1024px), et réduire la largeur du panel pour que tout tienne.

**2. Supprimer le bloc "Soft Skills" dans l'étape Compétences**
Dans `StepSkills` (ligne 526-543), il y a un bloc "Soft skills" séparé. L'utilisateur dit que c'est redondant car la section "Langues & Soft Skills" dans le CV les intègre déjà (via `languages_content` dans `adaptCVDataForTemplate` qui combine les deux). Il faut supprimer ce bloc du formulaire et nettoyer la logique associée (conserver les soft skills existants dans le state si besoin mais ne plus les afficher dans l'étape Compétences). Note : les templates `CVPreview.tsx` utilisent `allSkills = [...cvData.skills.technical, ...cvData.skills.soft]` — si on supprime l'UI soft skills, les données existantes ne seront plus alimentées.

**3. L'IA analyse-t-elle le CV à l'upload ?**
Oui : `onFileParsed` dans `CVBuilderEditor` déclenche la fonction edge `parse-cv-document` qui utilise l'IA pour extraire et structurer les données. Ce n'est pas un changement de code, juste une réponse à confirmer à l'utilisateur.

**4. Compétences techniques — max 2 éléments par ligne alors qu'on peut en mettre 3-4**
Dans `adaptCVDataForTemplate.ts` ligne 71 : `for (let i = 0; i < tech.length; i += 3)` → chunks de 3, mais `detail_1` prend le premier, `detail_2` prend `chunk.slice(1).join(", ")`. C'est pour les templates HTML-v1. Pour les templates legacy/canvas dans `CVPreview.tsx`, les compétences sont rendues en `flexWrap` avec des badges — pas de limite de 2. Le problème vient donc de l'adaptateur pour les templates html-v1 : il crée autant de lignes que nécessaire avec 3 éléments par ligne. Augmenter à 4 par ligne (chunks de 4) réduira la hauteur utilisée.

---

## Plan d'implémentation

### Fichiers à modifier

**`src/components/cv-builder/CVBuilderEditor.tsx`**
- Changer `aside` de `hidden xl:flex ... w-[360px]` → `hidden lg:flex ... w-[300px]`
- Dans `StepSkills` : supprimer le bloc "Soft skills" (div + SkillInput + state `inputSoft` + fonctions `addSoft`, `removeSoft`)
- Dans la sticky bottom bar, ajuster le `xl:right-[360px]` → `lg:right-[300px]`
- Dans l'aside previewRef, ajuster la scale : colonne 300px - padding 24px = 276px → scale = 276/794 ≈ 0.348

**`src/lib/cv-templates/adaptCVDataForTemplate.ts`**
- `formatSkillsForTemplate` : passer de chunks de 3 à chunks de 4 éléments par ligne
- Supprimer la partie qui injecte les soft skills dans le bloc `skills` (puisque les soft skills sont déjà dans `languages_content`)

### Résumé des changements visuels

```text
AVANT                          APRÈS
─────────────────────          ─────────────────────
Panel droit: hidden xl:flex    Panel droit: hidden lg:flex (visible dès 1024px)
w-[360px]                      w-[300px]  
scale: 0.423                   scale: 0.348 (336px → 276px)

Étape Compétences:             Étape Compétences:
  - Compétences techniques ✓     - Compétences techniques ✓
  - Langues ✓                    - Langues ✓
  - Soft Skills ✗ (supprimé)

Hard skills par ligne: 3       Hard skills par ligne: 4
Soft skills dans skills[]:     Soft skills: seulement dans
  injectés (redondant)           languages_content (langues & soft)
```

### Réponse sur l'IA + upload CV
Dans le plan, noter clairement à l'utilisateur : **oui**, quand on importe un PDF/DOCX/TXT dans la sidebar, la fonction edge `parse-cv-document` utilise l'IA (Gemini) pour analyser et structurer automatiquement les données dans tous les champs du formulaire.
