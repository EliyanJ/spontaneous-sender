

## Problème

La page `/createur-de-cv` affiche des templates **codés en dur** dans `GALLERY_TEMPLATES` (tableau statique dans `CVBuilder.tsx`). Ces templates n'ont rien à voir avec ce qui est créé dans l'admin — ils pointent sur de vieux screenshots (`/images/cv-template-*.png`).

Il y a **1 template canvas-v2** en base ("Nouveau template", actif, sans thumbnail). L'utilisateur veut que la galerie affiche uniquement les templates créés dans l'admin.

## Ce qu'on fait

### 1. Charger les templates depuis la BDD

Dans `CVBuilder.tsx`, remplacer le tableau statique `GALLERY_TEMPLATES` par un `useQuery` qui charge depuis `cv_templates` (filtre `is_active = true`).

### 2. Afficher la thumbnail du template admin

Chaque carte affiche :
- `thumbnail_url` si elle existe (screenshot du canvas)
- Sinon un **placeholder visuel** avec le nom du template et un fond dégradé

Structure de la carte :
```text
┌──────────────────────────┐
│   [image ou placeholder] │  ← 260px de hauteur
│   Votre Nom  (gradient)  │  ← nom live en bas
├──────────────────────────┤
│ Nom du template      [●] │
│ description courte...    │
└──────────────────────────┘
```

### 3. Adapter le sélecteur de template

Les templates canvas-v2 utilisent un `id` UUID (pas un `TemplateId` string). Il faut élargir le type de `templateId` pour accepter aussi des strings UUID, et passer cet ID au `CVBuilderEditor` pour que la bonne mise en page soit rendue.

On adapte `templateId` de `TemplateId` → `string` dans le state. L'éditeur reçoit déjà `templateId: string`, donc ça se propage naturellement.

### 4. Supprimer les vieux templates hardcodés

Supprimer entièrement `GALLERY_TEMPLATES` et son usage. Plus d'images statiques `/images/cv-template-*.png` dans la galerie.

### 5. État vide et chargement

- Pendant le chargement : skeleton grid 3 colonnes
- Si 0 template actif : message "Aucun modèle disponible pour le moment"
- Le template sélectionné par défaut = le premier de la liste

### 6. Filtrage photo

Le filtre "Avec photo / Sans photo" est conservé. Il faut savoir si le template supporte une photo. On peut ajouter un flag `has_photo` dans les métadonnées du template, ou le détecter dans le `html_template` JSON (chercher un élément `photo` dans les éléments canvas-v2). Pour simplifier, on garde le toggle mais on ne filtre pas strictement (tous les templates canvas-v2 apparaissent dans les deux modes) — c'est à l'admin de préciser ça plus tard.

## Fichiers modifiés

| Fichier | Changement |
|---|---|
| `src/pages/CVBuilder.tsx` | Remplacer `GALLERY_TEMPLATES` statique par `useQuery` BDD, adapter types, placeholder si pas de thumbnail |

## Résultat

La galerie affichera automatiquement tout nouveau template créé dans l'admin (actif = true), avec son screenshot si disponible, sinon un placeholder avec le nom.

