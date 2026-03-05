
## Problème identifié

Deux fichiers gèrent le thème de manière **manuelle et indépendante** de `next-themes`, en initialisant `isDark` à `true` par défaut :

- `src/pages/Index.tsx` — ligne 29 : `const [isDark, setIsDark] = useState(true);`
- `src/pages/Admin/AdminLayout.tsx` — ligne 36 : `const [isDark, setIsDark] = useState(true);`

Ces composants appliquent/retirent directement la classe `dark` sur `document.documentElement` via un `useEffect`, ce qui **écrase** le comportement de `next-themes` à chaque montage du composant. Résultat : peu importe ce que `ThemeProvider` a défini, le dashboard repasse toujours en dark.

## Solution

Remplacer le système `isDark/useEffect` maison par le hook `useTheme()` de `next-themes` dans les deux fichiers.

Le `ThemeToggle` doit aussi être mis à jour pour utiliser `useTheme` directement plutôt que de recevoir `isDark/onToggle` en props, ce qui simplifie tout.

### Fichiers à modifier

1. **`src/components/ThemeToggle.tsx`** — Supprimer les props, utiliser `useTheme()` en interne. Le composant gère lui-même l'état du thème.

2. **`src/pages/Index.tsx`** — Supprimer `isDark`, `setIsDark`, et le `useEffect` qui touche au DOM. Passer `<ThemeToggle />` sans props.

3. **`src/pages/Admin/AdminLayout.tsx`** — Même chose : supprimer `isDark`, `setIsDark`, et le `useEffect` DOM. Passer `<ThemeToggle />` sans props.

4. **`src/components/MobileNav.tsx`** — Retirer les props `isDark` et `onToggleTheme` si elles y sont passées, remplacer par `<ThemeToggle />` autonome.

### Résultat

Le thème sera entièrement contrôlé par `next-themes` (avec `defaultTheme="light"` et `storageKey="cronos-theme-v2"` déjà configurés dans `App.tsx`). Plus aucun composant ne forcera le dark au montage.
