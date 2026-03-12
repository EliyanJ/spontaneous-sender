
## Analyse du problème

### Ce qui se passe actuellement avec "Scrum Master"

1. L'utilisateur fait une analyse → `analyze-cv-ats` cherche un match dans `ats_professions`
2. "Scrum Master" n'existe pas → `needsProfessionSuggestion = true` → flag `needs_profession_suggestion = true` dans `cv_analyses`
3. **MAIS** : rien ne se passe automatiquement ensuite. L'admin doit aller dans l'onglet Analyses, trouver les analyses flaggées, cliquer "Suggérer un métier IA" manuellement pour chaque une.
4. La suggestion IA crée un `pending_review` → l'admin doit encore valider manuellement.

### Ce que l'utilisateur veut

Un **système à double déclencheur automatique** :

**Déclencheur 1 — Détection automatique en masse** : Quand il y a N analyses avec le même `job_title` non identifié → l'IA crée automatiquement la suggestion de métier sans intervention admin.

**Déclencheur 2 — Extraction statistique des mots-clés** : Sur un corpus d'analyses pour un même intitulé, calculer la **fréquence d'apparition** de chaque mot-clé dans les offres d'emploi. Les mots présents dans ≥70% des analyses = hard skills spécifiques du métier (même si c'est un métier rare). Cette logique statistique remplace/enrichit l'extraction IA.

### Architecture cible

```
Flux automatique
┌─────────────────────────────────────────────────────────┐
│  Analyse soumise                                        │
│  → job_title = "Scrum Master"                          │
│  → No match in ats_professions                         │
│  → needs_profession_suggestion = true                   │
│  → cv_analyses sauvegardée                              │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│  NOUVEAU: auto-cluster-professions (edge fn ou job-worker)│
│  Requête: GROUP BY normalize(job_title)                 │
│  Si count >= MIN_ANALYSES (ex: 3) pour un titre inconnu │
│  → Déclenche analyse fréquentielle des job_descriptions │
│  → Mots présents dans >= 70% des offres = primary_kw    │
│  → Mots présents dans 40-70% = secondary_kw            │
│  → Appel IA pour nommer le métier + trouver la thématique│
│  → Crée ats_profession avec status=pending_review       │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│  Admin voit badge "2 métiers à valider"                 │
│  dans l'onglet Thématiques                              │
│  → Valider / Modifier / Rejeter                         │
└─────────────────────────────────────────────────────────┘
```

---

## Plan d'implémentation

### 1. Nouvelle table `job_title_clusters` (migration SQL)

Stocke le regroupement des analyses non identifiées par intitulé normalisé :
```sql
CREATE TABLE public.job_title_clusters (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  normalized_title text NOT NULL UNIQUE,
  raw_titles text[] DEFAULT '{}',
  analysis_ids uuid[] DEFAULT '{}',
  analysis_count integer DEFAULT 0,
  keyword_frequencies jsonb DEFAULT '{}',  -- { "scrum": 0.92, "sprint": 0.85, ... }
  suggested_profession_id uuid REFERENCES ats_professions(id) ON DELETE SET NULL,
  status text DEFAULT 'pending',  -- 'pending' | 'processed' | 'validated'
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### 2. Mise à jour de `analyze-cv-ats` — alimenter les clusters

Quand `needsProfessionSuggestion = true` et que l'analyse est sauvegardée :
- Normaliser le `jobTitle` (lowercase, sans caractères spéciaux)
- `UPSERT` dans `job_title_clusters` : incrémenter `analysis_count`, ajouter l'`analysis_id`, ajouter `raw_title` si nouveau
- Calculer les fréquences de mots-clés à partir des `job_description` agrégées (**en DB via un simple comptage**, pas besoin d'IA)
- Si `analysis_count` atteint le seuil (3 par défaut) → appeler `ats-ai-review` en mode `suggest_profession` avec les mots fréquents en input, créer le `pending_review` automatiquement

**En pratique** : après le `insert` dans `cv_analyses`, on appelle une **sous-fonction** qui vérifie le cluster et, si le seuil est atteint, déclenche la suggestion.

### 3. Mise à jour de `ats-ai-review` — mode `auto_cluster_suggest`

Nouveau mode enrichi : reçoit les `keyword_frequencies` déjà calculées (pas besoin de les recalculer en IA).
- Input : `{ normalized_title, raw_titles[], high_freq_keywords[], medium_freq_keywords[], existing_themes[] }`
- L'IA n'a plus qu'à : nommer le métier proprement, choisir la thématique parente, catégoriser les mots-clés (primary/secondary/soft_skill)
- Output : `ProfessionSuggestion` standard → `createProfessionFromSuggestion()`

### 4. Admin UI — `AdminATSTraining.tsx`

**Onglet Thématiques** (badges + section clusters) :
- Badge `"N nouvelles suggestions IA"` dans l'onglet header si `pendingReview.length > 0`
- **Nouvelle section "Clusters en cours"** : liste les `job_title_clusters` avec `status='pending'` et leur `analysis_count` — pour visualiser les intitulés qui commencent à s'accumuler avant le seuil
- Afficher le seuil actuel et permettre à l'admin de le modifier (ex: slider 2-10 analyses)

**Onglet Analyses** :
- Badge `"N sans profession"` sur le compteur
- Pour les analyses `needs_profession_suggestion=true`, afficher le nom du cluster + progression (ex: "3/3 analyses · Suggestion créée ✓")

**Paramètre de seuil** : stocker dans un simple state (par défaut 3), permettre à l'admin de le changer via un input dans les settings de l'onglet.

---

## Fichiers à modifier

| Fichier | Changement |
|---|---|
| Migration SQL | Nouvelle table `job_title_clusters` |
| `supabase/functions/analyze-cv-ats/index.ts` | Après save de `cv_analyses` : UPSERT cluster + déclencher si seuil atteint |
| `supabase/functions/ats-ai-review/index.ts` | Nouveau mode `auto_cluster_suggest` avec keyword_frequencies en input |
| `src/pages/Admin/AdminATSTraining.tsx` | Section clusters dans Thématiques, badge, progression dans Analyses |

---

## Ce que ça change concrètement pour "Scrum Master"

- 1ère analyse Scrum Master → cluster créé (1/3)
- 2ème analyse → cluster mis à jour (2/3)
- 3ème analyse → seuil atteint → les mots présents dans 2/3 offres ou plus sont extraits → l'IA nomme le métier et choisit la thématique → `pending_review` créé **automatiquement**
- L'admin voit "1 métier à valider : Scrum Master (Gestion de projet) — 3 analyses" → il valide en 1 clic
- La 4ème analyse Scrum Master matche directement contre le profil créé, même s'il n'est pas encore validé (si on le met `active` dès la suggestion — ou on attend la validation)
