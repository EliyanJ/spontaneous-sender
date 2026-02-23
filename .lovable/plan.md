

# Mise a jour de la navigation Landing + Offres par defaut

## 1. Header de la Landing Page (`src/pages/Landing.tsx`)

Remplacer les 3 liens d'ancre actuels ("Fonctionnalites", "Comment ca marche", "Tarification") par 3 liens de navigation vers les pages CV :

| Ancien | Nouveau | Action |
|--------|---------|--------|
| Fonctionnalites (ancre `#features`) | Comparatif de CV | Navigue vers `/dashboard?tab=cv-score` |
| Comment ca marche (ancre `#how-it-works`) | Creation de CV | Navigue vers `/cv-builder` |
| Tarification (ancre `#pricing`) | Conseil personnalise | Navigue vers une section dediee (ou `/dashboard?tab=cv-advice`) |

- Les `scrollToSection()` sont remplaces par des `navigate()` vers les routes correspondantes.
- Le bouton "Voir la demo" dans le hero qui pointe vers `#how-it-works` sera aussi mis a jour pour pointer vers `/login`.
- Le lien "Tarification" reste accessible dans le footer ou via `/pricing`.

## 2. Offres d'emploi : chargement par defaut (`src/components/dashboard/JobOffers.tsx`)

Actuellement, la page affiche un formulaire vide et attend que l'utilisateur clique "Rechercher". 

Modification : ajouter un `useEffect` au montage qui lance automatiquement une recherche sans filtres (ou avec des parametres generiques) pour afficher des offres des le chargement de l'onglet.

```text
useEffect au montage -> appel france-travail sans motsCles ni commune
-> affiche les offres les plus recentes par defaut
```

## 3. Navigation mobile (`src/components/MobileNav.tsx`)

Ajouter les memes items CV (Comparatif, Creation, Conseil) dans le menu mobile pour garder la coherence.

## Fichiers modifies

| Fichier | Modification |
|---------|-------------|
| `src/pages/Landing.tsx` | Remplacer les 3 liens d'ancre par des liens de navigation (Comparatif CV, Creation CV, Conseil perso) |
| `src/components/dashboard/JobOffers.tsx` | Ajouter `useEffect` pour charger des offres par defaut au montage |
| `src/components/MobileNav.tsx` | Ajouter les items CV dans le menu mobile (optionnel, coherence) |

