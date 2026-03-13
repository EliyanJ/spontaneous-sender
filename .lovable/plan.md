

## Rapport : Diagnostic de l'export PDF

### Ce que l'image montre

Le PDF généré (cf. screenshot partagé) affiche le contenu **en texte brut, sans aucun style** : pas de couleurs, pas de layout, pas de mise en page. C'est du HTML dépouillé rendu directement par jsPDF sans css appliqué. C'est le signe classique d'un **scoping CSS cassé** ou d'une **cible DOM vide**.

---

### Analyse du code actuel (`exportPdf.ts`)

#### Flux actuel

```text
1. injectCVData(templateHtml, cvData)        → HTML final
2. DOMParser → extraire <style> + body.innerHTML
3. Préfixer le CSS avec #__cv_export_scope__ (boucle split/join)
4. Créer un <div id="__cv_export_scope__"> dans le DOM (position: fixed, left: -99999px)
5. Ajouter <style> scopé + bodyDiv.innerHTML dans ce conteneur
6. Attendre 700ms
7. Cibler .cv-page dans le conteneur
8. html2pdf().from(cvPage).save()
9. Cleanup
```

#### Problèmes identifiés

**Problème 1 — La cible `.cv-page` est introuvable (racine du blank PDF)**

Le `templateHtml` passé à `exportCVToPdf` vient de `CVBuilderEditor` (ligne 603-618). Ce query Supabase retourne la valeur de `html_template`. Or, **tous les templates actuels sont en `canvas-v2`** (JSON, pas HTML). La vérification `template_version === "html-v1"` dans `CVPreview` (ligne 579) ne s'applique qu'aux nouveaux templates html-v1.

Pour les templates legacy (`"classic"`, `"dark"`, etc.) et canvas-v2, `templateHtml` est soit **une chaîne JSON** soit **vide** → `injectCVData` échoue silencieusement → `parsed.body.innerHTML` est vide → `container.querySelector(".cv-page")` = null → fallback sur `bodyDiv` qui est un `<div>` vide → html2canvas capture un rectangle blanc.

**Problème 2 — Le CSS scoping par split/join est fragile**

La technique de scoper le CSS en découpant sur `}` est cassée dès qu'il y a :
- Des règles `@media { .selector { ... } }` (accolade imbriquée)
- Des commentaires CSS avec `}`
- Des règles `@keyframes`

Résultat : des sélecteurs malformés qui font que **aucun style ne s'applique**, même si le HTML est présent.

**Problème 3 — `left: -99999px` + `z-index: -9999`**

`html2canvas` peut rater les éléments avec `z-index` négatif dans certains navigateurs. La recommandation officielle est `position: absolute; top: -9999px; left: -9999px` **sans `z-index` négatif**.

**Problème 4 — Le `templateHtml` passé aux boutons est vide pour les templates legacy**

Dans `CVBuilderEditor` ligne 603-618, le query cherche `html_template` dans la table `cv_templates`. Si `templateId` est `"classic"` ou tout autre ID legacy, le regex `/^[0-9a-f-]{36}$/i` bloque le query (`enabled: false`). Donc `templateHtml = ""` → l'export PDF est appelé avec une chaîne vide.

---

### Solution correcte

Le problème fondamental est architectural : **les templates utilisés par les utilisateurs sont des templates React (canvas-v2 + legacy), pas des templates HTML balisés**. L'export PDF doit donc capturer le **DOM React déjà rendu** (ce qui est dans `CVPreview`), pas reconstruire un HTML à partir du template.

**Approche à implémenter :**

```text
NOUVELLE LOGIQUE PDF
─────────────────────────────────────────────
Au lieu de reconstruire le HTML depuis la DB :

1. Rendre CVPreview dans un conteneur off-screen (div fixe, hors viewport)
   → C'est du React rendu avec tous les styles inline (les templates legacy 
     utilisent des styles inline, pas des classes CSS externes)
   
2. Utiliser html2canvas directement sur ce div
   → Capture ce qui est visuellement rendu, identique à la preview
   
3. Convertir le canvas en image PNG → l'insérer dans jsPDF
   → Résultat A4 pixel-perfect

Pour les html-v1 (templateHtml présent) :
→ Garder l'approche div off-screen mais sans l'iframe,
  avec le CSS scopé MAIS utiliser postcss/manual re-scopage 
  simplifié (remplacer :root { et body { par #scope {)
```

**Changements à faire :**

1. **`CVExportButtons.tsx`** : Accepter une prop `previewRef` (ref vers le div du CVPreview déjà dans le DOM) + fallback sur reconstruction HTML
2. **`exportPdf.ts`** : Réécrire avec deux modes :
   - Mode "capture React" : prend un `HTMLElement` déjà rendu, html2canvas → jsPDF
   - Mode "html-v1" : reconstruit le HTML dans un div off-screen
3. **`CVBuilderEditor.tsx`** : Passer une ref du preview panel aux boutons d'export

**Fichiers à modifier :**
- `src/lib/cv-export/exportPdf.ts` — réécriture complète
- `src/components/cv-builder/CVExportButtons.tsx` — ajout prop `previewRef`
- `src/components/cv-builder/CVBuilderEditor.tsx` — ref sur le preview + passer aux boutons

