

# Refonte de la page "Historiques & Relances" (CampaignsHub)

## Vue d'ensemble

Redesign complet du composant `CampaignsHub.tsx` pour appliquer le style glassmorphisme de la maquette HTML fournie. La structure reste identique (2 micro-onglets Campagnes / Suivi) mais le rendu visuel est entierement revu.

## Changements visuels principaux

### 1. Header de page
- Titre "Campagnes" en `text-2xl font-bold text-white`
- Sous-titre gris : "Gere tes campagnes, relances et suivi des candidatures"
- Bouton engrenage (parametres delai) avec popover glassmorphisme
- Bouton "Actualiser" en `bg-indigo-600 hover:bg-indigo-700` avec shadow indigo

### 2. Tabs Campagnes / Suivi
- Pilule glassmorphisme (`glass-panel`) avec 2 boutons
- Onglet actif : `bg-indigo-500/10 text-indigo-400 border border-indigo-500/20`
- Onglet inactif : `text-muted hover:text-white`
- Icones : paper-plane (Campagnes) + chart-line (Suivi)

### 3. Onglet Campagnes

**a) Barre de recherche**
- Pleine largeur, glassmorphisme, icone loupe
- `bg-[#18181b]/30 border-white/20 rounded-xl focus:ring-indigo-500/50`

**b) Banner "Relances necessaires" (orange)**
- `bg-orange-500/10 border-orange-500/20 rounded-xl`
- Icone exclamation dans cercle orange
- Texte "X batch(es) ont depasse le delai..."
- Bouton "Tout relancer" en `bg-orange-500`

**c) Section "Emails programmes"**
- Titre avec icone horloge indigo
- Grille de cards glassmorphisme (1-3 colonnes)
- Chaque card : icone calendrier, badge countdown (`bg-indigo-500/10 text-indigo-300`), sujet, tags recipients, bouton "Annuler l'envoi" en rouge

**d) Section "Historique des envois"**
- Titre avec icone clock-rotate-left en teal
- Batches repliables :
  - Header : icone avion dans cercle colore, titre campagne, date, badge nb emails, badge statut (orange "Relance requise" / vert "En cours")
  - Chevron up/down
  - Contenu deploye : liste d'emails avec :
    - Avatar initiales dans cercle gradient
    - Email + "Envoye il y a X jours"
    - Badges statut : vert "Repondu" / gris "Pas de reponse"
    - Feedback thumbs up/down
    - Resume AI de la reponse dans encart `bg-surface/30` avec tag colore `[Positif]` / `[Negatif]`
    - Boutons : notes, exclure, relancer (indigo)
  - Footer batch : bouton "Relancer tout le batch" en `bg-white text-black`

### 4. Onglet Suivi (Pipeline)

**a) Header**
- Titre "Tracking candidature" en `text-xl font-bold`
- Toggle liste/stats : pilule avec 2 boutons icones

**b) Vue Liste**
- Barre de recherche + bouton "Filtres"
- Pipeline vertical par phase :
  - Titre phase avec emoji + compteur dans badge gris
  - Cards glassmorphisme avec `border-l-4` colore par phase
  - Hover : `translate-x-1`
  - Card : nom bold, localisation + email en sous-texte, badge statut, dropdown pour changer de phase

**c) Vue Stats**
- 4 KPI cards glassmorphisme avec `border-l-4` colore (Total, Envoyees, Entretiens, Acceptes)
- 2 graphiques Recharts dans des panneaux glassmorphisme (Pie chart donut + Bar chart horizontal)
- Card "Taux de conversion" avec 3 colonnes : pourcentages en gros + fleches entre colonnes

## Fichier a modifier

| Fichier | Action |
|---------|--------|
| `src/components/dashboard/CampaignsHub.tsx` | Reecriture complete du JSX avec le design glassmorphisme. Toute la logique metier (states, handlers, hooks, useMemo) reste 100% identique. |

## Details techniques

### Classes glassmorphisme reutilisees
```
glass-panel: bg-[#18181b]/60 backdrop-blur-xl border border-white/[0.08]
glass-card: bg-[#27272a]/40 backdrop-blur-lg border border-white/[0.05] hover:bg-[#27272a]/60 hover:border-indigo-500/30
```

### Avatars initiales dans les email rows
- Cercle `w-8 h-8 rounded-full bg-gradient-to-br from-gray-700 to-gray-800`
- Initiales en `text-xs font-medium text-white`

### Pipeline cards
- `border-l-4` avec couleur du stage (blue, violet, yellow, orange, indigo, green, red, emerald)
- Card "active" (entretien) : bordure indigo + fond `bg-indigo-500/5`

### Resume AI des reponses
- Encart `bg-[#18181b]/30 rounded p-2 border border-[#27272a]`
- Tag colore : `text-green-400 font-semibold` pour positif, `text-red-400` pour negatif, `text-blue-400` pour info

### Ce qui ne change PAS
- Tous les states et hooks (useState, useEffect, useMemo)
- Tous les handlers (handleSendFollowUp, handleRelanceBatch, handleCancelScheduled, etc.)
- Les interfaces TypeScript (Campaign, ScheduledEmail, CampaignBatch, etc.)
- PIPELINE_STAGES et toute la logique de pipeline
- Les appels Supabase et le systeme de feedback
- Les graphiques Recharts (juste le wrapper glassmorphisme change)
- Les AlertDialog de confirmation

### Responsive
- Desktop : layout complet avec grilles multi-colonnes
- Mobile : empilement vertical, email rows en flex-col, badges compacts

