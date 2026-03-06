

## Diagnostic — Pourquoi le dark mode ne marche pas sur la home

**Problème principal — ligne 40 de `Landing.tsx` :**
```tsx
<div className="min-h-screen bg-white relative overflow-hidden">
```
La racine de la page a `bg-white` codé en dur — elle écrase complètement `bg-background`, peu importe le thème. La classe `.dark` est appliquée sur `<html>`, mais le fond blanc opaque de cette div masque tout.

**Problème secondaire — ligne 42 :**
```tsx
<div className="fixed inset-0 z-0 pointer-events-none bg-gradient-to-br from-gray-50 via-white to-purple-50">
```
Le fond décoratif fixé (`fixed inset-0`) utilise aussi des couleurs light hardcodées : `gray-50`, `white`, `purple-50`.

**Problème Hero — lignes 68, 73, 89, 95, 98, 103, etc. :**
De nombreuses classes dans la Hero section sont statiques : `text-gray-900`, `text-gray-600`, `bg-white`, `border-gray-200`, `bg-gray-50`, `bg-gray-100`, `text-gray-500`, `text-gray-600`, `text-gray-400`… Ces classes ignorent la variable CSS `--foreground`.

---

## Plan d'exécution

### 1 — Fix dark mode `Landing.tsx`

**Wrapper racine (ligne 40) :**
```
bg-white → bg-background
```

**Fond décoratif (ligne 42) :**
```
bg-gradient-to-br from-gray-50 via-white to-purple-50 → bg-background
(+ ajouter dark:from-black dark:via-black dark:to-black/80 ou simplement supprimer le gradient en dark)
```

**Hero section — remplacements ciblés :**

| Avant | Après |
|---|---|
| `text-gray-900` | `text-foreground` |
| `text-gray-600` | `text-muted-foreground` |
| `text-gray-500` | `text-muted-foreground` |
| `text-gray-400` | `text-muted-foreground` |
| `bg-white` (mockup dashboard) | `bg-background` |
| `bg-gray-50` (mockup) | `bg-secondary` |
| `bg-gray-100` (browser bar) | `bg-muted` |
| `border-gray-200` | `border-border` |
| `border-2 border-white` (avatars) | `border-2 border-background` |
| Bouton "Voir la démo" `bg-white border-gray-200 text-gray-900 hover:bg-gray-50` | `bg-background border-border text-foreground hover:bg-accent` |

**Fond décoratif — solution propre :**
```tsx
<div className="fixed inset-0 z-0 pointer-events-none 
  bg-gradient-to-br from-gray-50 via-white to-purple-50
  dark:from-black dark:via-black dark:to-black">
```

---

### 2 — Renommage des URLs (routes + liens)

#### Dans `App.tsx` — nouvelles routes :

| Route actuelle | Nouvelle route |
|---|---|
| `/pricing` | `/prix` (+ garder `/pricing` en redirect) |
| `/cv-builder` | `/créateur-de-cv` (+ garder `/cv-builder`) |
| `/score-cv` | inchangé (déjà en fr) |
| `/offres-emploi` | inchangé |
| `/blog` | inchangé |

Pour les routes avec accents (`/créateur-de-cv`), React Router les gère nativement via `encodeURIComponent`. Cependant les accents dans les URL sont risqués (SEO, encodage). **Proposition alternative plus robuste :**
- `/prix` ✅ sans accent
- `/createur-de-cv` ✅ sans accent (variante sans accent)

Le `/#how-it-works` → `/#comment-ca-marche` (sans accent pour éviter l'encodage `%C3%A7`)

#### Dans `Header.tsx` — liens Outils TOOLS array :
```
/cv-builder → /createur-de-cv
/score-cv → inchangé
/offres-emploi → inchangé
/blog → inchangé
```
Lien "Tarif" : `/pricing` → `/prix`
`handleHowItWorks` : `#how-it-works` → `#comment-ca-marche`

#### Dans `Landing.tsx` — `id` de la section :
```
id="how-it-works" → id="comment-ca-marche"
```

#### Dans `App.tsx` — nouvelles routes :
```
/pricing → /prix
/cv-builder → /createur-de-cv
```
+ Ajouter des redirects pour les anciennes URLs (pour éviter les 404 sur les liens existants) :
```tsx
<Route path="/pricing" element={<Navigate to="/prix" replace />} />
<Route path="/cv-builder" element={<Navigate to="/createur-de-cv" replace />} />
```

---

## Fichiers modifiés

1. **`src/pages/Landing.tsx`** — Fix dark mode (wrapper, fond décoratif, Hero section)
2. **`src/components/Header.tsx`** — Mise à jour des hrefs TOOLS + lien "Tarif" + `handleHowItWorks`
3. **`src/App.tsx`** — Nouvelles routes `/prix` et `/createur-de-cv` + redirects

