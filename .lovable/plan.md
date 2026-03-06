
## Analyse de l'état actuel

**Header actuel (Landing.tsx)** :
- Logo + "Cronos"
- Nav : "Comment ça marche" (scroll), "Conseil personnalisé" (/blog), "Tarifs" (scroll), "Offres d'emploi" (/offres-emploi)
- Bouton : "Commencer" (violet)

**Header actuel (PublicNav.tsx)** — utilisé sur CVBuilder pour visiteurs non connectés :
- Logo + "Cronos" ✅
- Nav : "Comparatif de CV", "Création de CV", "Conseil personnalisé", "Offres d'emploi", "Tarifs" ✅
- Boutons : "Se connecter" + "Commencer" ← **la Landing n'a que "Commencer", pas "Se connecter"**

**Constat** : Le `PublicNav` est déjà correct pour les pages SEO (il a plus de liens que la Landing). L'image uploadée montre le header connecté (dashboard). Le vrai problème signalé est que le header CVBuilder avec user connecté manque de liens. → En réalité le user voit la capture d'écran du header dashboard (`← Tableau de bord | CV Builder`) sur `/cv-builder` quand connecté, pas le PublicNav.

**Filtrage photo — bug actuel** :
```
const visibleTemplates = withPhoto
  ? GALLERY_TEMPLATES           // ← quand withPhoto=true, montre TOUS les templates
  : GALLERY_TEMPLATES.filter(t => !t.hasPhoto);  // ← quand false, filtre sans photo
```
Le comportement attendu : 
- "Avec photo" → afficher seulement les templates `hasPhoto: true`
- "Sans photo" → afficher seulement les templates `hasPhoto: false`
Actuellement quand `withPhoto=true` il montre tous les templates (y compris ceux sans photo).

**Nom/Prénom temps réel — problème** :
Le badge nom s'affiche en overlay sur l'image du template, mais les images sont des PNG statiques (screenshots de CV). On ne peut pas modifier le texte dans un PNG. La solution attendue par le user est que le nom apparaisse en overlay sur la carte (ce qui est déjà fait via le badge coloré en bas de l'image). Il faut vérifier que `firstName`/`lastName` se propagent bien et que le badge est lisible et prominent sur TOUTES les cartes.

## Ce qu'on change

### 1. `PublicNav.tsx` — Aligner avec la Landing
La Landing a "Comment ça marche" (scroll → n'existe pas sur d'autres pages) et "Offres d'emploi". Les pages SEO ont besoin de liens cliquables vers d'autres pages. Le PublicNav actuel est déjà bien adapté aux pages SEO. 

**Problème réel** : L'image uploadée montre que quand l'user est **connecté**, le header CVBuilder affiche `← Tableau de bord | CV Builder` sans les liens de nav normaux. → On garde ce header compact pour les users connectés (c'est un outil, pas une page SEO pour eux).

**Action** : Le PublicNav est OK. On va s'assurer qu'il s'affiche correctement sur `/cv-builder` pour les visiteurs non connectés avec tous ses liens visibles.

### 2. Fix filtrage photo `CVBuilder.tsx`
```typescript
// AVANT (bugué)
const visibleTemplates = withPhoto
  ? GALLERY_TEMPLATES
  : GALLERY_TEMPLATES.filter(t => !t.hasPhoto);

// APRÈS (correct)
const visibleTemplates = GALLERY_TEMPLATES.filter(t => t.hasPhoto === withPhoto);
```
Ainsi :
- Toggle ON (avec photo) → uniquement les templates `hasPhoto: true` (Moderne Pro, Créatif Plus, Étudiant = 3 templates)
- Toggle OFF (sans photo) → uniquement les templates `hasPhoto: false` (Classique Elite, Executive, Minimaliste = 3 templates)

### 3. Améliorer l'aperçu nom/prénom temps réel
Actuellement le badge s'affiche seulement quand `firstName || lastName` est non vide. Il faut :
- **Toujours afficher** un emplacement nom (avec placeholder "Votre Nom" visible même vide)
- Positionner le nom de manière plus prominente sur l'image (au centre/haut plutôt qu'en bas)
- Appliquer `font-bold` et bonne taille pour être lisible

### 4. Bouton photo en deux états clairs (UX)
Remplacer le toggle switch par **deux boutons radio** clairs :
```
[ 📷 Avec photo ]  [ 🚫 Sans photo ]
```
Cela rend l'interaction plus évidente et correspond au comportement attendu (cliquer change la liste).

## Fichiers modifiés
- `src/pages/CVBuilder.tsx` : fix filtrage photo + amélioration overlay nom/prénom + UX boutons photo
- `src/components/PublicNav.tsx` : vérification/ajout du lien "Tarifs" pointant vers `/pricing` (déjà présent ✅) + s'assurer que "Se connecter" et "Commencer" sont bien visibles
