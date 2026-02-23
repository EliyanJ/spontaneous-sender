

# Correction des logos : proportions, variantes et suppression du texte "Cronos" en espace reduit

## Problemes identifies

1. **Proportions non respectees** : Le logo est force en carre (`w-8 h-8`, `w-7 h-7`, `h-20 w-20`, etc.) avec `rounded-lg` partout, ce qui deforme le logo original.
2. **Logo sans background non utilise** : `logo-transparent.png` (sans fond) devrait etre utilise partout sur fond sombre. Le `cronos-logo.png` actuel pointe deja vers le logo blanc sur fond noir, mais il est applique avec `rounded-lg` qui le coupe.
3. **Texte "Cronos" affiche meme quand l'espace manque** : Sur mobile/petit ecran, le texte devrait disparaitre et ne laisser que le logo.

## Strategie

- **Fond sombre** (dashboard, admin, auth, onboarding, footer) : utiliser `logo-transparent.png` (sans background)
- **Fond blanc/clair** (Login carte blanche, Help) : utiliser `logo-blue.png` ou `logo-black.png`
- **Proportions** : remplacer les classes carrees (`w-8 h-8`) par `h-8 w-auto` pour respecter le ratio naturel du logo. Supprimer `rounded-lg`/`rounded-xl`/`rounded-2xl` sur le logo (il a deja sa propre forme).
- **Espaces reduits** : masquer le texte "Cronos" via `hidden` et ne garder que le logo seul.

## Fichiers a modifier

| Fichier | Changements |
|---------|-------------|
| `src/pages/Index.tsx` | Import `logo-transparent.png`. Classes `h-7 w-auto sm:h-8` sans rounded. Mobile : logo seul sans texte "Cronos". Footer : `h-4 w-auto sm:h-5`. |
| `src/pages/Landing.tsx` | Import `logo-transparent.png`. Header : `h-10 w-auto` sans rounded. Footer : `h-8 w-auto`. |
| `src/pages/Login.tsx` | Import `logo-blue.png` pour la carte blanche. `h-16 w-auto` sans rounded. Overlay de redirection : import `logo-transparent.png`, `h-20 w-auto`. |
| `src/pages/Auth.tsx` | Import `logo-transparent.png`. `h-20 w-auto` sans rounded. |
| `src/pages/Onboarding.tsx` | Import `logo-transparent.png`. `h-10 w-auto` sans rounded. |
| `src/pages/ForgotPassword.tsx` | Import `logo-transparent.png`. `h-16 w-auto` sans rounded. |
| `src/pages/ResetPassword.tsx` | Import `logo-transparent.png`. `h-16 w-auto` sans rounded. |
| `src/pages/ConnectGmail.tsx` | Import `logo-transparent.png`. Tailles corrigees. |
| `src/pages/ConnectGmailCallback.tsx` | Import `logo-transparent.png`. `h-20 w-auto`. |
| `src/pages/Help.tsx` | Import `logo-transparent.png` (fond sombre). `h-8 w-auto`. |
| `src/pages/BlogPost.tsx` | Import `logo-transparent.png`. Tailles corrigees. |
| `src/pages/Admin/AdminLayout.tsx` | Import `logo-transparent.png`. `h-8 w-auto` sans rounded. Mobile : masquer texte "Admin" si trop petit. |
| `src/pages/Admin/AdminPageEditor.tsx` | Import `logo-transparent.png`. Tailles corrigees. |

## Regles appliquees partout

- `className="h-X w-auto"` au lieu de `h-X w-X` (ratio naturel conserve)
- Suppression de `rounded-lg`, `rounded-xl`, `rounded-2xl` sur les balises `<img>` du logo
- Quand l'espace est reduit (mobile) : `<span className="hidden sm:inline">Cronos</span>` deja en place, on s'assure que c'est le cas partout
- Les pages sur fond sombre utilisent `logo-transparent.png`
- Les pages avec carte blanche (Login) utilisent `logo-blue.png` dans la carte, `logo-transparent.png` pour l'overlay

