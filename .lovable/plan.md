
## Diagnostic du problème

**Cause racine identifiée dans `src/pages/Landing.tsx` lignes 25-44 :**

```tsx
const [isDark, setIsDark] = useState(() => {
  const saved = localStorage.getItem('theme');  // ← lit 'theme' (ancienne clé)
  return saved === 'dark';
});

useEffect(() => {
  if (isDark) {
    document.documentElement.classList.add('dark');    // ← manipulation directe du DOM
    localStorage.setItem('theme', 'dark');             // ← écrit dans 'theme' (ancienne clé)
  } else {
    document.documentElement.classList.remove('dark'); // ← écrase ce que next-themes fait
    localStorage.setItem('theme', 'light');
  }
}, [isDark]);
```

La page Landing gère **son propre système de thème** en parallèle de `next-themes` :
- Elle lit `localStorage.getItem('theme')` (ancienne clé) au lieu de `cronos-theme-v2` (clé de next-themes)
- Elle manipule directement `document.documentElement.classList` — ce qui **écrase** immédiatement ce que `next-themes` vient de faire
- Résultat : le `ThemeToggle` appelle `setTheme('dark')` via next-themes → ça change la classe `dark` → mais au moindre re-render de Landing, le `useEffect` local **remet la classe à son état initial** (light)

Le ThemeToggle du dashboard fonctionne car le dashboard n'a pas ce useEffect parasite.

## Solution

**Un seul fichier à modifier : `src/pages/Landing.tsx`**

Supprimer :
1. Le state `isDark` local (lignes 25-28)
2. Le `useEffect` qui manipule `document.documentElement.classList` (lignes 36-44)
3. La prop `isDark`/`setIsDark` qui pourrait être passée à `<Header />` (non applicable ici car Header utilise `ThemeToggle` directement)

Le `ThemeProvider` dans `App.tsx` est déjà configuré correctement avec `attribute="class"` et `storageKey="cronos-theme-v2"` — il suffit de laisser next-themes faire son travail sans interférence.

## Résultat attendu

Le `ThemeToggle` dans le header de la Landing changera le thème de **toute l'application** exactement comme dans le dashboard, car next-themes gérera seul la classe `.dark` sur `<html>`.
