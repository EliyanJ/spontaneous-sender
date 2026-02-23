

# Refonte du CV Builder : layout split avec formulaire interactif et drag & drop

## Probleme actuel

Le flow actuel impose 3 etapes sequentielles (intro -> import texte brut -> editeur). L'utilisateur doit coller du texte brut puis generer, ce qui est peu intuitif. La preview n'apparait qu'a la fin.

## Nouvelle architecture UX

Le CV Builder devient une **page unique en layout split** (4 colonnes gauche / 8 colonnes droite) des le depart, coherent avec le design system glassmorphisme du dashboard.

```text
+-------------------------------------------+
|  Header: Logo + "CV Builder" + Sauvegarder |
+-------------------------------------------+
|  LEFT (4 cols)       |  RIGHT (8 cols)     |
|  - Mode tabs         |  - Preview A4 live  |
|    (Creer / Adapter) |    qui se met a     |
|  - Zone drop CV      |    jour en temps    |
|  - Secteur           |    reel             |
|  - Formulaire        |                     |
|    sections          |                     |
|  - Fiche de poste    |                     |
|    (mode adapter)    |                     |
+-------------------------------------------+
```

## Changements detailles

### 1. Suppression du flow multi-etapes

- Plus de `step = "intro" | "import" | "editor"`. La page affiche directement le layout split.
- En haut du panneau gauche : deux onglets "Creer un CV" / "Adapter a une offre" pour changer de mode.

### 2. Zone de drop-and-drag pour le CV

- En haut du panneau gauche, une zone de drag & drop (dotted border) ou l'utilisateur peut :
  - Glisser un PDF/DOCX/TXT
  - Cliquer pour ouvrir le file picker
  - Ou selectionner un CV depuis sa base de donnees (bouton "Mes CVs")
- Quand un fichier est depose, il est parse automatiquement et les champs du formulaire se remplissent.
- La zone se reduit apres import (petite barre avec le nom du fichier + bouton "Changer").

### 3. Formulaire toujours visible

- Le formulaire (infos perso, accroche, experiences, formation, competences, langues) est **toujours affiche** sous la zone de drop.
- Les champs sont pre-remplis si un CV a ete importe, sinon vides pour saisie manuelle.
- Chaque modification met a jour la preview en temps reel.

### 4. Mode "Adapter a une offre"

- Quand l'onglet "Adapter" est selectionne, un champ "Fiche de poste" apparait entre la zone de drop et le formulaire.
- Un bouton "Optimiser avec IA" analyse le CV vs la fiche de poste et reformule les bullets.

### 5. Preview A4 toujours visible

- Le panneau droit affiche la preview A4 en permanence, meme quand les champs sont vides (template vide avec placeholders grises).
- Responsive : sur mobile, la preview est masquee avec un bouton "Voir l'apercu" qui l'affiche en plein ecran.

### 6. Selection de CV depuis la base de donnees

- Un bouton "Mes CVs" dans la zone de drop ouvre un petit popover listant les `user_cv_profiles` de l'utilisateur.
- Cliquer sur un CV pre-remplit le texte brut puis lance le parsing IA.

## Fichiers a modifier

| Fichier | Action |
|---------|--------|
| `src/pages/CVBuilder.tsx` | **Rewrite** - Supprimer le flow multi-etapes, implementer le layout split direct avec tabs mode, zone drop, formulaire et preview |
| `src/components/cv-builder/CVBuilderIntro.tsx` | **Supprimer** - Plus necessaire, les modes sont des tabs dans le panneau gauche |
| `src/components/cv-builder/CVBuilderForm.tsx` | **Modifier** - Ajouter la zone drag & drop en haut, selection depuis DB, et champ fiche de poste conditionnel |
| `src/components/cv-builder/CVPreview.tsx` | **Modifier leger** - Afficher des placeholders quand les donnees sont vides |

## Details techniques

### Zone Drag & Drop
- Utiliser les evenements natifs `onDragOver`, `onDragLeave`, `onDrop` sur une div stylisee.
- Au drop : detecter le type de fichier et lancer le meme parsing base64 que le flow actuel.
- Etat visuel : bordure en pointilles au repos, highlight bleu au survol, nom du fichier apres import.

### Tabs de mode
- Deux boutons stylises en haut du panneau gauche : "Creer" et "Adapter".
- Le mode "Adapter" ajoute le champ fiche de poste + le bouton "Optimiser avec IA".

### Bouton "Mes CVs"
- Requete vers `user_cv_profiles` pour lister les CVs sauvegardes.
- Affichage dans un Popover avec le nom et la date de chaque CV.

### Layout
- `grid grid-cols-1 lg:grid-cols-12 gap-6`
- Gauche : `lg:col-span-4` avec scroll interne
- Droite : `lg:col-span-8` avec preview fixe

