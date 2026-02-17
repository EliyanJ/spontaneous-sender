

# Corrections onboarding : saisie manuelle, boucle de redirection et design

## Problemes identifies

1. **Secteurs** : pas possible de taper un secteur manuellement, seulement des tags predefinis
2. **Interets** : meme probleme, pas de champ libre pour ajouter un interet personnalise
3. **Boucle infinie** : apres avoir clique "Terminer", la page ne redirige pas vers le tableau de bord. Le `ProtectedRoute` conserve l'etat `onboardingCompleted = false` en memoire (jamais re-verifie), donc il redirige en boucle vers `/onboarding`
4. **Design** : la page est trop sobre, il manque le logo Cronos et une identite visuelle

---

## Corrections prevues

### 1. StepSectors.tsx - Ajout saisie manuelle de secteurs

- Ajouter un champ texte avec un bouton "Ajouter" sous la liste de tags predefinis
- L'utilisateur tape un secteur libre, appuie Entree ou clique Ajouter, et ca s'ajoute comme un tag selectionne
- Les tags manuels apparaissent au meme niveau que les tags predefinis (style identique)

### 2. StepInterests.tsx - Ajout saisie manuelle d'interets

- Meme principe : champ texte + bouton Ajouter sous les tags predefinis
- Les interets personnalises apparaissent dans la meme grille

### 3. ProtectedRoute.tsx - Correction de la boucle

Le bug : quand `Onboarding.tsx` fait `navigate("/dashboard")`, le composant `ProtectedRoute` qui enveloppe `/dashboard` se monte avec `onboardingCompleted = false` (etat initial). Le `useEffect` depend de `[user, loading]` qui n'ont pas change, donc il ne se re-execute pas et on reste bloque avec `false`.

**Solution** : ajouter `location.pathname` dans les dependances du `useEffect` pour forcer une re-verification quand on change de page. Ainsi, quand on arrive sur `/dashboard` apres l'onboarding, le profil est re-lu depuis la base de donnees et `onboarding_completed = true` est detecte.

### 4. Onboarding.tsx - Redesign avec logo et meilleur style

- Ajouter le logo Cronos en haut de la page (import de `src/assets/cronos-logo.png`)
- Ajouter un fond avec un leger degrade ou motif
- Ameliorer le header avec le nom de l'app et un message d'accueil
- Styler la barre de progression et les etapes avec des couleurs plus engageantes
- Ajouter des animations de transition entre les etapes

---

## Fichiers modifies

| Fichier | Modification |
|---------|-------------|
| `src/components/onboarding/StepSectors.tsx` | Ajout champ texte libre pour secteurs personnalises |
| `src/components/onboarding/StepInterests.tsx` | Ajout champ texte libre pour interets personnalises |
| `src/components/ProtectedRoute.tsx` | Ajout `location.pathname` dans les deps du useEffect pour corriger la boucle |
| `src/pages/Onboarding.tsx` | Redesign avec logo Cronos, degrade, meilleur espacement, transitions |

