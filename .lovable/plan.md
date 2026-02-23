

# Refonte de la page "Recherche de contact" (ContactSearch)

## Vue d'ensemble

Redesign complet du composant `ContactSearch.tsx` pour appliquer le style glassmorphisme de la maquette HTML fournie. La logique metier (recherche emails, timer, states, handlers, Sheet) reste 100% identique, seul le JSX/UI est reecrit.

## Changements visuels principaux

### 1. Header de page
- Titre "Recherche de contact" en `text-2xl lg:text-3xl font-bold text-white tracking-tight`
- Sous-titre : "Gerez vos recherches d'emails et suivez vos campagnes." en `text-sm text-gray-400`

### 2. Top Grid Layout (2 + 1 colonnes)

**a) CTA Card principale (col-span-2)**
- `glass-panel rounded-2xl p-6 relative overflow-hidden`
- Glow decoratif : `absolute -right-20 -top-20 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl`
- Icone loupe dans carre `w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20`
- Titre "Rechercher les informations" + sous-texte "X entreprises en attente..."
- Bouton gradient `bg-gradient-to-r from-indigo-600 to-violet-600` avec icone eclair + shadow `shadow-indigo-500/20`
- Hover : `scale-[1.02]`, Active : `scale-[0.98]`

**b) Stats Card "Emails trouves" (col-span-1)**
- `glass-panel rounded-2xl p-6` avec icone envelope-check en vert
- Badge `+X%` en `bg-green-400/10 text-green-400 rounded-full`
- Chiffre en `text-3xl font-bold text-white`
- Mini chart SVG decoratif en `absolute bottom-0 right-0 opacity-30`

### 3. Stats Row (4 colonnes)
- 4 cards `glass-panel rounded-2xl p-5 flex items-center gap-4`
- Chaque card : cercle icone `w-10 h-10 rounded-full bg-zinc-800` + label uppercase `text-xs text-gray-500` + valeur `text-xl font-bold`
  - "En attente" : icone Clock, valeur blanche
  - "Sans email" : icone Ban/XCircle, valeur blanche
  - "Taux succes" : icone Target, valeur `text-indigo-400`
  - "Voir la liste" : bouton interactif `border-dashed border-white/20 hover:border-indigo-500/50`, ouvre le Sheet

### 4. Tableau "Derniers resultats"
- Panel `glass-panel rounded-2xl overflow-hidden`
- Header : titre "Derniers resultats" + barre de recherche `bg-[#09090b] border border-white/[0.1] rounded-lg` + bouton filtre
- En-tete tableau : `bg-white/[0.02] border-b border-white/[0.05]` avec colonnes grid-cols-12 (Entreprise, Localisation, Statut, Action)
- Lignes : `hover:bg-white/[0.02]` avec :
  - Avatar initiale dans carre colore `w-8 h-8 rounded font-bold text-xs`
  - Nom entreprise `text-sm font-medium text-white` + secteur `text-xs text-gray-500`
  - Localisation `text-sm text-gray-400`
  - Badges statut :
    - Vert "Email trouve" : `bg-green-500/10 text-green-400 border-green-500/20` + pastille verte
    - Jaune "En recherche" : `bg-yellow-500/10 text-yellow-400 border-yellow-500/20` + pastille animee
    - Rouge "Sans email" : `bg-red-500/10 text-red-400 border-red-500/20` + icone X
  - Bouton ellipsis en hover : `opacity-0 group-hover:opacity-100`

### 5. Overlay de recherche (inchange visuellement)
- Garde le pattern plein ecran `fixed inset-0 z-[100]` avec jauge SVG circulaire
- Applique le glassmorphisme au conteneur : `glass-panel rounded-2xl` au lieu de `Card`
- Stats row : `bg-[#18181b]/50 rounded-lg` au lieu de `bg-muted/50`
- Barre live results : `bg-[#18181b]/50 rounded` au lieu de `bg-muted/50`

### 6. Ecran "Recherche terminee"
- Card glassmorphisme `glass-panel rounded-2xl` avec gradient subtil
- Cercle succes `bg-green-500/20` avec CheckCircle en vert
- Bouton CTA "Lancer une campagne" en `bg-white text-black font-semibold rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.15)]`

### 7. Sheet (panneau lateral)
- Style glassmorphisme sur le contenu : `bg-[#09090b] border-l border-white/[0.08]`
- Cards entreprises : `glass-panel p-4 rounded-xl border border-white/[0.05] hover:border-indigo-500/30`
- Chaque card : nom en bold, code postal dans badge `bg-zinc-800 text-gray-400 text-[10px] rounded`, pastille couleur statut

## Fichier a modifier

| Fichier | Action |
|---------|--------|
| `src/components/dashboard/ContactSearch.tsx` | Reecriture complete du JSX avec le design glassmorphisme. Toute la logique metier reste 100% identique. |

## Details techniques

### Couleurs des avatars initiales (rotation)
```text
Index 0 -> bg-white text-black
Index 1 -> bg-indigo-600 text-white
Index 2 -> bg-blue-500 text-white
Index 3 -> bg-purple-600 text-white
Index 4 -> bg-emerald-600 text-white
Index 5 -> bg-amber-500 text-black
```

### Taux de succes
- Calcul : `companiesWithEmail.length / companies.length * 100` affiche en `text-indigo-400`

### Ce qui ne change PAS
- Interfaces TypeScript (SearchResult, CompanyInfo, ContactSearchProps)
- Tous les states (companies, companiesWithoutEmail, companiesWithEmail, loading, isSearching, results, summary, etc.)
- Tous les handlers (handleSearch, handleGoToCampaigns, loadCompanies)
- useEffect pour le timer et le chargement
- Le composant CreditsNeededModal
- Le Sheet et ScrollArea pour la liste entreprises
- L'overlay de recherche en cours (logique identique, juste le style glassmorphisme)

### Responsive
- Desktop : grid 3 colonnes pour le top, 4 colonnes pour les stats, tableau complet
- Tablette : 2 colonnes, tableau simplifie
- Mobile : empilement vertical, tableau masque au profit d'une liste cards

