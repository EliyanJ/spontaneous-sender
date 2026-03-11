
## Diagnostic du problème de contraste en mode clair

**Cause racine — `CVComparator.tsx` entièrement hardcodé "dark"**

Le composant `CVComparator` utilise **uniquement** des classes dark-mode hardcodées :
- Fonds : `bg-[#18181b]/60`, `bg-[#121215]/60` → noirs fixes, invisibles sur fond blanc
- Textes : `text-white`, `text-gray-400`, `text-gray-300`, `text-gray-500` → blancs/gris sur fond blanc = 0 contraste
- Bordures : `border-white/[0.08]` → quasi-invisibles en mode clair
- Cercle SVG : `text-gray-800` → gris sur blanc = mauvais contraste

Le header du composant (`text-white`, `text-gray-400`) est lui aussi hardcodé, mais la page `/score-cv` (CVScorePage.tsx) est déjà propre avec `text-foreground/muted-foreground`.

**Ce que dit le maquette HTML fournie** :
- Fonds cartes : `rgba(255,255,255,0.9)` + `border-gray-200` en light → glassmorphism blanc
- Textareas : fond `#f9fafb`, bordure `#e5e7eb`, texte `#374151`
- Badges "trouvés/manquants" : même logique verte/rouge mais sur fond clair

---

## Plan d'exécution

### Un seul fichier à modifier : `src/components/dashboard/CVComparator.tsx`

Remplacer toutes les classes hardcodées dark par des tokens sémantiques **avec variantes dark:**, en suivant exactement le design system défini :

**Règle de conversion :**

| Hardcodé | Token sémantique |
|---|---|
| `bg-[#18181b]/60 backdrop-blur-xl border border-white/[0.08]` | `bg-card/60 backdrop-blur-xl border border-border` |
| `bg-[#121215]/60 border border-white/[0.1]` | `bg-muted/50 border border-border` |
| `text-white` (titres) | `text-foreground` |
| `text-gray-400` | `text-muted-foreground` |
| `text-gray-300` | `text-foreground/80` |
| `text-gray-500` | `text-muted-foreground` |
| `text-gray-600` | `text-muted-foreground` |
| `border-t-white/[0.1]` | `border-t-border` |
| `border-white/[0.05]` | `border-border/50` |
| Cercle SVG `text-gray-800` | `text-border` |
| Textarea placeholder `placeholder-gray-600` | `placeholder-muted-foreground/40` |
| `bg-white/[0.03]` (mini-stats) | `bg-muted/20` |

**Tags spéciaux à conserver inchangés** (couleurs sémantiques de score) :
- Badges verts/rouges/amber pour les keywords → garder `bg-green-500/10 text-green-400` etc.
- Glow coloré du score → garder `style={{ backgroundColor: getScoreColor() }}`
- Bouton d'analyse → garder `bg-gradient-to-r from-indigo-600 to-violet-600`
- Header section (ligne 298 `text-white`) → `text-foreground`
- Reset button (ligne 309 `bg-[#18181b]/60 text-gray-300`) → `bg-card/60 text-muted-foreground`
- Loading overlay card → même traitement

**Fichier modifié :** `src/components/dashboard/CVComparator.tsx` uniquement
