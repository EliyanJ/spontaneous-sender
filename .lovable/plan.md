
## Analyse du problème "Secondary Keywords"

### Ce que fait réellement cette catégorie dans le code

Dans `analyze-cv-ats/index.ts`, ÉTAPE 6 (lignes 301-344) :
- Elle prend les `dbSecondaryKeywords` de la profession en base **qui apparaissent dans l'offre**
- PUIS elle complète avec des mots extraits bruts de l'offre (mots fréquents >= 1 occurrence, qui ne sont pas déjà dans primary)
- Le résultat = max 5 mots, 15 pts max au total (3 pts/mot)

**Le vrai problème** : La majorité des mots qui finissent dans "secondary" sont en réalité des mots extraits bruts de l'offre d'emploi (fallback), pas des compétences catégorisées. C'est pour ça qu'on voit des mots comme "développement" ou "équipes" — ce sont des mots fréquents de l'offre, pas des compétences transversales.

### Décision de refonte

La catégorie `secondaryKeywords` dans l'algo remplit **deux fonctions différentes** qui sont mélangées :
1. Des vrais mots-clés secondaires catégorisés en base (légitimes)
2. Des mots extraits bruts en fallback quand pas assez de mots en base (souvent incorrects)

**Solution proposée** : Fusionner les secondary keywords DANS les Hard Skills au niveau du scoring, et supprimer l'affichage séparé "Compétences transversales" côté frontend. Les secondary keywords DB légitimes continueront à compter dans le score (via la fonction), mais ne seront plus affichés comme une catégorie à part qui crée de la confusion.

---

## Plan d'implémentation

### 1. Frontend — CVComparator.tsx (suppressions)

**Supprimer 3 sections** du résultat :

- **"Compétences transversales"** (lignes 724-754) — toute la card `result.secondaryKeywords.scores.length > 0`
- **"Bonus de proximité"** (lignes 787-802) — le bloc `result.proximity.bonus > 0`
- **"Conseils personnalisés"** (lignes 804-831) — le bloc `adviceItems.length > 0`
- Nettoyer aussi les `adviceItems` qui réfèrent à `missingSecondary` (lignes 268-273 dans la construction des conseils)
- **"Section Profil"** dans la grille Structure & Format (lignes 690-696) — supprimer cet item de la grille

### 2. Admin ATS — AdminATSTraining.tsx (refonte UI)

**Onglet édition thématique (edit-theme)** :
- Les labels dans `renderKeywordList` restent en anglais technique actuellement ("Hard Skills (primary)", "Secondary Keywords"...). Les renommer en français clair avec icônes :
  - `"🔵 Hard Skills — Compétences techniques"` (primary)
  - `"🟣 Mots-clés secondaires — Compétences complémentaires"` (secondary)  
  - `"🟢 Soft Skills — Savoir-être"` (soft_skills)
  - `"🔴 Mots exclus — Mots courants / hors contexte"` (excluded)

**Onglet revue (review tab)** — améliorer la lisibilité des lignes :
- Actuellement (ligne 658) : `flex items-center gap-2 flex-wrap` → le badge + texte + boutons s'étalent sur la largeur avec le Select "Reclasser" très à droite
- **Nouveau layout** : ligne avec fond coloré par catégorie, mot bien visible à gauche, actions groupées à droite dans un bloc compact
- Ajouter **"Mot courant"** dans le Select de reclassement (valeur `"common_word"` → traité comme `excluded` dans `applyCorrections`)
- Afficher le commentaire IA (`fb.admin_notes`) avec un label de catégorie traduit : `🤖 Reclassé → Hard Skill / Compétence secondaire / Soft Skill / Mot exclu` au lieu du texte brut encodé

### 3. Edge function ats-ai-review — fix encodage + common_word

**Fix encodage** (ligne 162) : Ajouter dans le system prompt :
```
Tu es un expert RH/ATS. Réponds UNIQUEMENT en UTF-8 correct avec les accents français (é, è, à, ç...). N'utilise jamais d'entités HTML ni d'encodages alternatifs. Réponds uniquement avec le JSON demandé.
```

**Ajouter `common_word`** dans l'enum `corrected_category` (ligne 179) :
```json
"enum": ["primary", "secondary", "soft_skill", "excluded", "common_word"]
```

**Mettre à jour le prompt principal** pour expliquer à l'IA ce qu'est `common_word` :
```
- common_word : mot trop courant du français, sans valeur de compétence (ex: "travail", "équipe", "développement" au sens générique)
```

### 4. Frontend applyCorrections — gérer common_word

Dans `AdminATSTraining.tsx` ligne 318, ajouter le cas `common_word` :
```typescript
else if (fb.corrected_category === "common_word") newExcluded.push(fb.keyword); // traité comme excluded
```

---

## Fichiers modifiés

| Fichier | Changement |
|---|---|
| `src/components/dashboard/CVComparator.tsx` | Suppression sections : Secondary Keywords, Proximity Bonus, Conseils personnalisés, item "Section Profil" dans Structure |
| `src/pages/Admin/AdminATSTraining.tsx` | Labels français dans edit-theme, refonte layout lignes revue, ajout "Mot courant", fix affichage commentaire IA |
| `supabase/functions/ats-ai-review/index.ts` | Fix encodage prompt, ajout common_word dans enum |

