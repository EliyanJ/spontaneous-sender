
## Problème identifié
Le site démarre en dark mode (`isDark = true` dans `Landing.tsx` avec fallback `localStorage`), et la couleur primaire est **bleu** (`217 91% 55%`) au lieu du **violet** `#7C3AED` de la charte GetCronos. En light mode, tout est blanc sans identité visuelle → ressemble à une page vierge.

## Ce qu'on change

### 1. Default → Light mode
- `Landing.tsx` : changer `useState(() => saved === 'dark' ? ... : true)` en défaut `false` (light)
- Supprimer le `dark` de l'init localStorage si absent

### 2. Accent violet #7C3AED au lieu du bleu
Conversion HSL de `#7C3AED` → `hsl(263 75% 58%)`
- `--primary` : `263 75% 58%` (violet)
- `--primary` dark : `263 75% 63%` (violet plus lumineux)
- Hover accent `#6D28D9` → `hsl(263 75% 50%)`
- Gradients mis à jour avec violet
- `--ring` mis à jour
- Gradient text → violet vers indigo

### 3. Light mode plus coloré / charte visible
Actuellement le light mode utilise `--background: 220 20% 97%` (quasi blanc sans personnalité) et `--accent: 220 14% 96%` (gris neutre invisible).

On enrichit :
- `--background` : garder `0 0% 100%` (#FFFFFF) pur
- `--secondary` background : `248 20% 96%` (légère teinte violette dans le fond secondaire)
- `--accent` : `263 30% 94%` (accent violet pâle visible dans les hover/cartes)
- `--accent-foreground` : `263 75% 40%` (texte violet sur accent)
- `--muted` : `248 15% 95%` (légère teinte)
- `--border` : `263 20% 88%` (bordures avec légère teinte violette)
- `--gradient-primary` : violet → indigo `linear-gradient(135deg, hsl(263 75% 58%), hsl(263 75% 45%))`
- `--gradient-accent` : violet → indigo profond
- Success garde `#22C55E` → `142 76% 36%` (déjà correct)
- `--glow-primary` → couleur violet

### 4. Gradient text & `.glass` mis à jour
- `.gradient-text` : violet → indigo `hsl(263 75% 58%)` → `hsl(280 60% 60%)`
- `glow-pulse` animation : utilise la nouvelle couleur primaire violet

## Fichiers modifiés
- `src/index.css` : variables CSS light + dark (primary violet, accents, gradients)  
- `src/pages/Landing.tsx` : défaut light mode (`isDark = false`)
