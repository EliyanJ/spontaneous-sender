
## État actuel

- `PublicNav.tsx` : existe mais **n'est importé nulle part** — il peut être supprimé directement
- Les 5 pages publiques (`CVScorePage`, `CVBuilder`, `JobOffersPublic`, `Blog`, `Pricing`) utilisent **déjà** `<Header />` de `Header.tsx`
- `index.css` : le bloc `.dark` utilise des valeurs violettes teintées (ex: `263 20% 6%`) au lieu du noir pur `0 0% 0%` demandé
- `Header.tsx` : utilise des classes hardcodées `slate-*` au lieu de tokens sémantiques (`bg-background`, `text-foreground`, `border-border`)

---

## Plan d'exécution

### Étape 1 — Supprimer PublicNav.tsx
Suppression pure du fichier `src/components/PublicNav.tsx` (déjà inutilisé).

### Étape 2 — Remplacer le bloc `.dark` dans `index.css`
Lignes 58–95, remplacement exact par les valeurs noir pur demandées :

```css
.dark {
  --background: 0 0% 0%;
  --foreground: 0 0% 100%;
  --card: 0 0% 6%;
  --card-foreground: 0 0% 100%;
  --popover: 0 0% 6%;
  --popover-foreground: 0 0% 100%;
  --primary: 263 75% 60%;
  --primary-foreground: 0 0% 100%;
  --secondary: 0 0% 10%;
  --secondary-foreground: 0 0% 100%;
  --muted: 0 0% 10%;
  --muted-foreground: 0 0% 70%;
  --accent: 0 0% 12%;
  --accent-foreground: 263 75% 70%;
  --destructive: 0 63% 45%;
  --destructive-foreground: 0 0% 100%;
  --border: 0 0% 15%;
  --input: 0 0% 15%;
  --ring: 263 75% 60%;
  /* gradients/glows mis à jour */
  --gradient-primary: linear-gradient(135deg, hsl(263 75% 60%), hsl(263 75% 48%));
  --gradient-accent: linear-gradient(135deg, hsl(263 75% 50%), hsl(280 60% 45%));
  --gradient-surface: linear-gradient(180deg, hsl(0 0% 6%), hsl(0 0% 0%));
  --glow-primary: 0 0 40px hsl(263 75% 60% / 0.3);
  --glow-accent: 0 0 60px hsl(263 75% 60% / 0.15);
}
```

### Étape 3 — Nettoyer Header.tsx (remplacer classes hardcodées)

| Avant | Après |
|---|---|
| `bg-white/70 dark:bg-slate-900/70` | `bg-background/70` |
| `border-white/50 dark:border-white/10` | `border-border/50` |
| `text-slate-600 dark:text-slate-300` (nav links) | `text-foreground/70` |
| `text-slate-700 dark:text-slate-300` (burger) | `text-foreground/80` |
| Menu mobile `bg-white/80 dark:bg-slate-900/90` | `bg-background/90` |
| Menu mobile `border-white/50 dark:border-white/10` | `border-border/50` |
| `text-slate-700 dark:text-slate-200` (items mobile) | `text-foreground` |
| `border-slate-200 dark:border-slate-700` | `border-border` |
| `text-slate-400` (label "Outils") | `text-muted-foreground` |
| Dropdown `bg-white/80 dark:bg-slate-800/90` | `bg-background/80` |
| Dropdown items `text-slate-800 dark:text-slate-100` | `text-foreground` |
| Dropdown items `text-slate-500 dark:text-slate-400` | `text-muted-foreground` |
| `text-slate-600 dark:text-slate-300` (Connexion) | `text-foreground/70` |

**Fichiers touchés :** `src/components/PublicNav.tsx` (suppression), `src/index.css`, `src/components/Header.tsx`
