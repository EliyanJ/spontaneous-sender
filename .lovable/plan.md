

## Problèmes identifiés — CVBuilderEditor.tsx

### Bug 1 : Soft skills à 2 endroits dans la preview
Dans `StepSkills`, les soft skills ont leur propre bloc séparé (lignes 480-497). Le bloc **Langues** est lui aussi dans `StepSkills` (lignes 499-537). Il faut **supprimer le bloc "Soft skills" de sa position actuelle** et le **déplacer juste après le bloc Langues**, dans l'ordre : Compétences techniques → Langues → Soft skills.

### Bug 2 : Deux boutons "Sauvegarder mon CV"
- Un dans `StepFinalize` (ligne 568-573) — dans le corps de l'étape
- Un dans la barre de navigation sticky du bas (ligne 858-863) — visible aussi à l'étape finalize

**Fix** : Supprimer le bouton du `StepFinalize` et garder seulement celui de la barre sticky, ou inversement. Le plus propre : supprimer le bouton de `StepFinalize` (le sticky est toujours visible et cohérent avec les autres étapes).

### Bug 3 : "Sauvegarder" → "Télécharger en PDF / Word"
Remplacer les deux occurrences de "Sauvegarder mon CV" par un bouton **"Télécharger mon CV"** avec options PDF/Word. Pour l'instant sans vraie logique d'export (qui est un travail séparé), le bouton appellera `onSave` mais avec un libellé et design orientés téléchargement.

**Fix** : Remplacer dans la barre sticky (étape finalize) le bouton `Save` par un groupe de deux boutons : **Télécharger en PDF** et **Télécharger en Word** (tous deux appelant `onSave` pour l'instant, avec un toast "Export PDF/Word bientôt disponible" pour le Word).

### Bug 4 : Input compétences techniques bloque à une lettre
**Cause** : `SkillInput` est un composant défini **à l'intérieur de `StepSkills`** (ligne 422). À chaque render de `StepSkills`, ce composant est **recréé** (nouvelle référence de fonction), ce qui provoque un remount de l'input — la saisie perd le focus après chaque caractère.

**Fix** : Sortir `SkillInput` du scope de `StepSkills` et le définir comme composant de niveau module (avant `StepSkills`), en lui passant les handlers via props. Ou plus simple : remplacer le composant `SkillInput` interne par du JSX inline dans `StepSkills`.

---

## Fichier modifié

**`src/components/cv-builder/CVBuilderEditor.tsx`** — modifications ciblées :

1. **Ligne 422-442** : Sortir `SkillInput` du corps de `StepSkills` → le déclarer au niveau module
2. **Lignes 480-497** : Déplacer le bloc soft skills **après** le bloc langues (lignes 499-537)
3. **Lignes 542-574** : Dans `StepFinalize`, supprimer le bouton "Sauvegarder mon CV" (ligne 568-573), garder seulement l'aperçu
4. **Lignes 857-863** : Remplacer le bouton "Sauvegarder mon CV" par deux boutons côte-à-côte : "Télécharger en PDF" (Download) + "Télécharger en Word" (FileDown)

