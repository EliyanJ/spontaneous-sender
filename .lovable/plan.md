

# Refonte de la page Recherche du Dashboard

## Vue d'ensemble

Redesign complet de la page de recherche (`SearchCompanies`) pour correspondre a la maquette UX Pilot. Le changement principal est le passage d'un flow multi-etapes (select -> filters -> results) a un **layout 2 colonnes simultane** (panneau de recherche a gauche, resultats a droite).

## Changements visuels principaux

### 1. Layout general
- **Actuel** : Flow en etapes sequentielles (mode -> filtres -> resultats)
- **Nouveau** : Grille `grid-cols-12` avec panneau gauche (col-span-4) et resultats a droite (col-span-8), visibles en meme temps

### 2. Toggle Mode IA / Manuel (centre en haut)
- Pilule arrondie avec 2 boutons : "Mode IA" (icone wand/sparkles) et "Manuel"
- Indicateur anime (slider indigo) sur le mode actif
- Identique a la maquette

### 3. Panneau gauche (col-span-4)
3 cartes empilees :

**a) Carte "Assistant Recherche" (IA)**
- Badge "Beta" en haut a droite
- Icone robot + titre
- Textarea (placeholder: "Je cherche une startup tech a Paris...")
- Compteur caracteres (0/500)
- Bouton gradient indigo/violet "Lancer la recherche IA"

**b) Carte "Filtres Manuels"**
- Bordure superieure teal
- 4 champs : Secteur (dropdown avec badge compteur), Departement (dropdown), Code APE (input), Taille (dropdown)
- Bouton "Appliquer les filtres"
- Lien "Reinitialiser"

**c) Carte "Passe au Premium" (upgrade banner)**
- Bordure gradient indigo/violet
- Icone couronne
- Texte + lien "Voir les offres"
- Visible uniquement pour les plans non-Premium

### 4. Panneau droit (col-span-8) - Resultats
**Header des resultats :**
- Titre "Resultats" + compteur entre parentheses
- Sous-titre "Base sur tes criteres..."
- Tri par : dropdown (Pertinence, Date, Taille)
- Toggle vue grille/liste

**Cards entreprise (grille 2 colonnes) :**
- Design glassmorphisme (glass-panel)
- Logo : carre blanc avec initiale du nom en gras
- Nom de l'entreprise (hover -> couleur indigo)
- Localisation + secteur sous le nom
- Tags colores : type (Startup/Scale-up/Licorne en teal), taille (en violet), secteur (en bleu)
- Description courte (line-clamp-2)
- Boutons : "Ajouter" (indigo) + lien externe (icone)
- Etat "Deja ajoute" (grise, disabled)
- Icone bookmark en haut a droite

**Pagination en bas :**
- "Affichage X-Y sur Z"
- Boutons de pages numerotees

## Fichiers a modifier

| Fichier | Action |
|---------|--------|
| `src/components/dashboard/SearchCompanies.tsx` | Reecriture du composant principal : layout 2 colonnes, integration des panels AI + filtres + resultats simultanes |
| `src/components/dashboard/search/SearchResultsStep.tsx` | Reecriture complete : nouveau design des cards (logo initiale, tags, bookmark, description) + pagination |
| `src/components/dashboard/search/AISearchMode.tsx` | Redesign : carte glassmorphisme avec textarea, badge Beta, compteur caracteres |
| `src/components/dashboard/search/ManualSearchMode.tsx` | Adaptation en panneau compact pour le layout colonne gauche (filtres inline au lieu de grille 3 colonnes) |
| `src/components/dashboard/search/SearchFiltersStep.tsx` | Potentiellement integre dans le panneau gauche (fusion avec ManualSearchMode) |

## Details techniques

### Cards entreprise - nouveau design
- Initiale du nom dans un carre blanc arrondi (`w-12 h-12 rounded-xl bg-white`)
- Tags avec couleurs semantiques : `bg-teal-500/10 text-teal-400 border-teal-500/20` pour le type, `bg-purple-500/10` pour la taille
- Hover effect : `translateY(-2px)` + glow indigo
- Bookmark toggle (outline/solid)

### Glassmorphisme des panneaux
```css
background: rgba(26, 26, 46, 0.85);
backdrop-filter: blur(12px);
border: 1px solid rgba(255, 255, 255, 0.08);
border-radius: 1.5rem;
```
Traduit en Tailwind : `bg-card/85 backdrop-blur-xl border border-white/[0.08] rounded-3xl`

### Flow simplifie
- Plus de navigation par etapes (select -> filters -> results)
- Les filtres et les resultats sont visibles en meme temps
- La recherche se lance et les resultats apparaissent dans le panneau droit
- Le job progress s'affiche dans le panneau droit en remplacement temporaire des resultats

### Ce qui ne change PAS
- La logique metier (appels API search-companies, job-worker)
- Le systeme de sauvegarde des entreprises (saveCompany, saveAllCompanies)
- Le feature gating par plan (AutomaticSearch pour Free/Standard sans AI/Manual)
- Le hook useJobQueue et le composant JobProgressCard (juste repositionne)
- La navigation header et le footer (geres par Index.tsx)

### Responsive
- Desktop : 2 colonnes (4+8)
- Mobile : empilement vertical, panneau filtres repliable, cards en colonne unique

