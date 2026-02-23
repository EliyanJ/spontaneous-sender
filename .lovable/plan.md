
# Refonte de la page "Offres d'emploi" (JobOffers)

## Vue d'ensemble

Redesign complet du composant `JobOffers.tsx` pour appliquer le style glassmorphisme de la maquette HTML fournie. La logique metier (recherche France Travail, chargement des details, states) reste 100% identique, seul le JSX/UI est reecrit.

## Changements visuels principaux

### 1. Header de page
- Titre "Offres d'emploi" en `text-2xl md:text-3xl font-bold text-white`
- Sous-titre avec badge "France Travail" : `bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded px-2 py-0.5`
- Pilule compteur a droite : pastille verte animee + "X offres trouvees" dans un encart glassmorphisme arrondi

### 2. Carte de recherche (glassmorphisme)
- Panel `bg-[#18181b]/60 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-6`
- Glow decoratif `bg-indigo-600/10 blur-3xl` en arriere-plan
- Grille `grid-cols-12` :
  - **Col-span-8** : 2 inputs cote a cote (Mots-cles avec icone loupe + Localisation avec icone pin)
  - **Col-span-4** : 2 selects (Type contrat + Distance) + bouton "Rechercher" gradient indigo-violet avec shadow
- Inputs style `glass-input` : `bg-[#121215]/60 border border-white/10 rounded-xl py-3 focus:border-indigo-500 focus:ring-indigo-500/20`

### 3. Etat de chargement
- Spinner custom : cercle `border-4 border-white/10` + `border-t-indigo-500 animate-spin`
- Texte "Recherche des meilleures offres en cours..." en `text-gray-400 animate-pulse`

### 4. Liste des resultats (cards offres)
- Cards glassmorphisme : `bg-[#18181b]/60 backdrop-blur-xl border border-white/[0.08] rounded-xl p-5`
- `border-l-4 border-l-transparent hover:border-l-indigo-500`
- Hover : `hover:bg-indigo-500/5` avec transition
- Chaque card :
  - **Titre** : `text-lg font-semibold text-white group-hover:text-indigo-300`
  - **Badge contrat** : couleurs semantiques (indigo pour CDI, purple pour CDD, blue pour interim)
  - **Nom entreprise** : `text-indigo-400 font-medium text-sm`
  - **Metadata** : icones lucide (MapPin, Clock, Euro) + texte `text-xs text-gray-400`
  - **Description** : `text-sm text-gray-300/80 line-clamp-2`
  - **Competences** : pills `bg-[#27272a]/80 text-gray-300 text-xs border border-white/5 rounded-full`
  - **Bouton bookmark** a droite (desktop) : cercle `bg-[#18181b] border border-white/10 rounded-full`
  - **"Voir details"** en hover : `text-xs text-indigo-400 opacity-0 group-hover:opacity-100`

### 5. Etat vide (pas de resultats)
- Cercle avec icone loupe en glassmorphisme
- Titre "Lancez une recherche" + sous-texte

### 6. Modal detail offre (glassmorphisme)
- Overlay `bg-black/60 backdrop-blur-sm`
- Contenu : `bg-[#121215]/95 backdrop-blur-2xl border border-white/[0.08] rounded-2xl max-w-3xl`
- **Header sticky** : titre `text-2xl font-bold`, entreprise avec icone building en indigo, bouton X
- **Badges metadata** : encarts `bg-[#18181b]/60 border border-white/10 rounded-lg` avec icones indigo
- Badge salaire specifique : `bg-green-500/10 border-green-500/20 text-green-400`
- **Sections** avec `border-l-2 border-indigo-500 pl-3` sur les titres :
  - Description du poste (texte + liste a puces)
  - Competences : pills `bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 rounded-full`
  - Formation : items avec bullet indigo
  - A propos de l'entreprise : encart `bg-[#18181b]/40 border border-white/10 rounded-xl`
- **Footer CTA** : bouton "Postuler sur le site" en `bg-white text-black font-semibold rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.15)]`
- Sous-texte : "Vous serez redirige vers le site du recruteur..."

## Fichier a modifier

| Fichier | Action |
|---------|--------|
| `src/components/dashboard/JobOffers.tsx` | Reecriture complete du JSX avec le design glassmorphisme. Toute la logique metier (states, handlers, API calls, interfaces) reste 100% identique. |

## Details techniques

### Mapping des badges contrat
```text
CDI       -> bg-indigo-500/20 text-indigo-300 border-indigo-500/30
CDD       -> bg-purple-500/20 text-purple-300 border-purple-500/30
MIS       -> bg-blue-500/20 text-blue-300 border-blue-500/30
SAI       -> bg-amber-500/20 text-amber-300 border-amber-500/30
LIB       -> bg-teal-500/20 text-teal-300 border-teal-500/30
default   -> bg-gray-500/20 text-gray-300 border-gray-500/30
```

### Date relative
- Utiliser `date-fns` (deja installe) avec `formatDistanceToNow` + `{ locale: fr }` pour afficher "Publie il y a X jours"

### Ce qui ne change PAS
- Interface `JobOffer` et `SearchResponse`
- States : loading, offers, selectedOffer, searchParams
- Handlers : handleSearch, loadOfferDetails, handleOfferClick
- Appels API : supabase.functions.invoke (france-travail)
- Le composant CommuneSearch pour la localisation

### Responsive
- Desktop : grille 12 colonnes pour la recherche, cards avec bookmark a droite
- Mobile : empilement vertical, bookmark masque, metadata en flex-wrap
