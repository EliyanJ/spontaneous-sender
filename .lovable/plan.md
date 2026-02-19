

# Systeme de Machine Learning pour le Score CV -- Back-office Admin

## Vue d'ensemble

Creer un systeme d'apprentissage iteratif dans le back-office admin pour ameliorer progressivement la precision du scoring ATS. L'admin peut revoir les analyses, valider/corriger les classifications de mots-cles, et entrainer le systeme thematique par thematique. Le tout avec une option de validation manuelle ET une option de validation assistee par IA.

---

## Architecture du systeme

Le systeme repose sur 3 piliers :

1. **Thematiques** : Categories de metiers (RH, Marketing, Dev, etc.) -- ce sont les `ats_professions` existantes, enrichies
2. **Historique des analyses** : Chaque analyse CV est sauvegardee en base pour etre revue par l'admin
3. **Feedback loop** : L'admin valide/corrige les mots-cles, et ces corrections sont reinjectees dans les `ats_professions`

```text
Utilisateur analyse CV
        |
        v
+-------------------+
| analyze-cv-ats    | --> Sauvegarde resultat dans `cv_analyses`
+-------------------+
        |
        v
+-------------------+
| Admin back-office | --> Revue par thematique
+-------------------+
        |
   [Manuel / IA]
        |
        v
+-------------------+
| ats_professions   | --> Keywords mis a jour
+-------------------+
        |
        v
  Prochaines analyses plus precises
```

---

## Modifications de la base de donnees

### Nouvelle table : `cv_analyses`

Stocke chaque analyse CV pour revue admin.

| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid | PK |
| user_id | uuid | Utilisateur qui a lance l'analyse |
| job_title | text | Intitule du poste |
| job_description | text | Fiche de poste |
| cv_text | text | Texte extrait du CV |
| profession_id | uuid (nullable) | Thematique identifiee (FK vers ats_professions) |
| profession_name | text | Nom de la thematique identifiee |
| total_score | numeric | Score total |
| analysis_result | jsonb | Resultat complet de l'analyse (tout le JSON) |
| admin_reviewed | boolean | Deja revue par l'admin ? |
| admin_feedback | jsonb | Feedback de l'admin (corrections, remarques) |
| created_at | timestamptz | Date de l'analyse |

RLS : Admins peuvent tout voir/modifier. Insertion via service role dans l'edge function.

### Nouvelle table : `ats_keyword_feedback`

Stocke les corrections individuelles de mots-cles.

| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid | PK |
| profession_id | uuid | FK vers ats_professions |
| keyword | text | Le mot-cle concerne |
| original_category | text | Categorie originale (primary, secondary, soft_skill, none) |
| corrected_category | text | Categorie corrigee par l'admin |
| is_valid | boolean | Le mot est-il pertinent ? |
| admin_notes | text | Remarques de l'admin |
| source | text | 'manual' ou 'ai' |
| created_at | timestamptz | |

RLS : Admins uniquement.

### Enrichissement de `ats_professions`

Ajouter des colonnes :

| Colonne | Type | Description |
|---------|------|-------------|
| category | text | Thematique parent (RH, Marketing, Tech, etc.) |
| aliases | jsonb | Intitules de poste equivalents pour regroupement |
| excluded_words | jsonb | Mots a exclure du scoring (faux positifs identifies) |
| last_trained_at | timestamptz | Derniere mise a jour par feedback |
| training_count | integer | Nombre de feedbacks integres |

---

## Nouveaux fichiers a creer

### Pages Admin

| Fichier | Role |
|---------|------|
| `src/pages/Admin/AdminATSTraining.tsx` | Page principale du machine learning ATS |
| `src/pages/Admin/ats/ATSAnalysesList.tsx` | Liste des analyses CV par thematique |
| `src/pages/Admin/ats/ATSReviewPanel.tsx` | Panel de revue d'une analyse avec validation mot par mot |
| `src/pages/Admin/ats/ATSThematiques.tsx` | Vue des thematiques et leur etat d'entrainement |

### Edge function

| Fichier | Role |
|---------|------|
| `supabase/functions/ats-ai-review/index.ts` | IA qui valide automatiquement les mots-cles a la place de l'admin |

---

## Fichiers a modifier

| Fichier | Modification |
|---------|-------------|
| `supabase/functions/analyze-cv-ats/index.ts` | Sauvegarder chaque analyse dans `cv_analyses` + utiliser `excluded_words` |
| `src/pages/Admin/AdminLayout.tsx` | Ajouter onglet "ATS Training" dans la nav admin |
| `src/App.tsx` | Ajouter route `/admin/ats` |
| `supabase/config.toml` | Ajouter config pour `ats-ai-review` |

---

## Details techniques

### 1. Sauvegarde automatique des analyses

Dans `analyze-cv-ats`, apres le calcul du score, inserer automatiquement le resultat dans `cv_analyses` :
- user_id, job_title, job_description, cv_text (tronque a 10000 chars)
- profession_id et profession_name identifies
- total_score
- analysis_result : tout le JSON de resultat
- admin_reviewed: false

### 2. Interface admin -- Page ATS Training

**Vue principale** avec 3 sous-sections (onglets) :

**a) Thematiques** : Liste des thematiques existantes (ats_professions) groupees par categorie
- Nombre d'analyses par thematique
- Nombre de feedbacks integres
- Derniere date d'entrainement
- Bouton pour voir/editer les mots-cles de chaque thematique

**b) Analyses a revoir** : File d'attente des analyses non revues
- Filtrable par thematique, par score, par date
- Bouton "Actualiser" pour charger de nouvelles analyses
- Pour chaque analyse : affichage du job title, score, thematique identifiee
- Clic pour ouvrir le panel de revue

**c) Panel de revue** (une analyse specifique) :
- Affiche le score, la thematique, les mots-cles identifies
- Pour chaque mot-cle : badge colore selon categorie (primary/secondary/soft_skill)
- Boutons rapides : Valider / Invalider / Reclassifier
- Zone de texte pour remarques
- Bouton "Valider par IA" qui appelle `ats-ai-review` pour automatiser
- Bouton "Appliquer les corrections" qui met a jour `ats_professions`

### 3. Workflow de correction

Quand l'admin corrige un mot-cle :
1. La correction est enregistree dans `ats_keyword_feedback`
2. Quand l'admin clique "Appliquer", les mots valides sont ajoutes aux bonnes categories dans `ats_professions`, les mots invalides sont ajoutes a `excluded_words`
3. `last_trained_at` et `training_count` sont mis a jour

### 4. Edge function `ats-ai-review`

Recoit une analyse et utilise Lovable AI (Gemini) pour :
- Verifier chaque mot-cle identifie : est-ce une vraie competence/soft skill ?
- Proposer une reclassification si necessaire
- Generer des remarques explicatives
- Retourner un JSON structure avec les validations/corrections suggerees

L'admin peut ensuite accepter ou rejeter les suggestions de l'IA.

### 5. Utilisation des `excluded_words` dans le scoring

Dans `analyze-cv-ats`, lors de l'extraction des keywords de la fiche de poste :
- Charger les `excluded_words` de la profession identifiee
- Filtrer ces mots avant le scoring
- Cela evite que des mots courants (liaisons, mots generiques) soient comptes comme competences

### 6. Regroupement par thematique

Les intitules de poste similaires sont regroupes via le champ `aliases` dans `ats_professions` :
- "Charge de recrutement RH" et "Chef de projet RH" tombent sous la thematique "Ressources humaines"
- L'admin peut ajouter/modifier les aliases depuis l'interface
- Le matching de profession utilise aussi les aliases pour une meilleure identification

---

## Ordre d'implementation

1. Migration DB : nouvelles tables + colonnes sur ats_professions
2. Modifier `analyze-cv-ats` pour sauvegarder les analyses et utiliser excluded_words
3. Creer la page admin `AdminATSTraining` avec les 3 sous-sections
4. Creer l'edge function `ats-ai-review`
5. Ajouter la route et le lien dans la nav admin

