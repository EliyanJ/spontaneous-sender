
## Problèmes identifiés

### 1. Bug build — AdminATSTraining.tsx (lignes 192-200)
La déclaration `const loadAnalyses = async () => {` est manquante — le corps de la fonction est orphelin et génère deux erreurs de compilation : `await` hors async function + syntaxe invalide.

**Fix** : Ajouter `const loadAnalyses = async () => {` entre les lignes 191 et 193.

---

### 2. Contraste mode clair — CampaignsHub.tsx & UnifiedEmailSender.tsx
Les deux fichiers utilisent des couleurs hardcodées pour le dark mode :
- Fonds noirs : `bg-[#18181b]`, `bg-[#121215]`, `bg-[#27272a]`
- Textes blancs/gris zinc : `text-white`, `text-zinc-400/500`, `text-gray-200`
- Bordures opaques : `border-white/[0.08]`, `border-white/10`

En mode clair, ça donne du texte blanc sur fond blanc → illisible.

**Fix** : Remplacer toutes les couleurs hardcodées par les classes CSS variables du thème :

| Avant | Après |
|---|---|
| `bg-[#18181b]/60`, `bg-[#121215]/60` | `bg-card/80` |
| `bg-[#27272a]/40` | `bg-muted/40` |
| `bg-[#18181b]/30` | `bg-muted/30` |
| `text-white`, `text-gray-200`, `text-gray-100` | `text-foreground` |
| `text-zinc-400`, `text-zinc-500`, `text-gray-500` | `text-muted-foreground` |
| `text-zinc-300` | `text-foreground/80` |
| `border-white/[0.08]`, `border-white/10` | `border-border` |
| `border-white/[0.05]` | `border-border/50` |

Les tooltips Recharts seront aussi mis à jour pour utiliser `hsl(var(--card))` et `hsl(var(--border))`.

---

## Fichiers modifiés

| Fichier | Changement |
|---|---|
| `src/pages/Admin/AdminATSTraining.tsx` | Ajouter la déclaration `const loadAnalyses = async () => {` manquante |
| `src/components/dashboard/CampaignsHub.tsx` | Remplacer ~80 occurrences de classes hardcodées dark-mode |
| `src/components/dashboard/UnifiedEmailSender.tsx` | Remplacer ~40 occurrences de classes hardcodées dark-mode |
