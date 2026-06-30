
## 1. Bug — import du CV sur /score-cv

**Cause** : la page `/score-cv` est publique (sans login). Quand l'utilisateur dépose un CV, `CVComparator` appelle l'edge function `parse-cv-document`. Or cette fonction exige un JWT utilisateur valide :

```ts
const { data: { user }, error } = await supabaseClient.auth.getUser(token);
if (authError || !user) return 401 'Unauthorized';
```

Côté navigateur sans session, le SDK envoie la clé anon → `getUser(anonKey)` échoue → l'UI affiche « Erreur lors de l'import du CV ». L'autre edge function `analyze-cv-ats` accepte déjà le mode hybride (anon ou JWT), mais `parse-cv-document` non — d'où la rupture.

**Fix** : aligner `parse-cv-document` sur le pattern hybride déjà utilisé (cf. mem `hybrid-auth-pattern`) :
- accepter le header `Authorization` quand c'est la clé anon (accès public lecture seule sur la fonction)
- ne valider le JWT que s'il est différent de la clé anon, sans bloquer
- garder un rate-limit léger par IP pour éviter l'abus (table `rate_limits` existe déjà)
- valider la taille du base64 (rejet > ~6 Mo) et le type MIME

## 2. État réel de la "méthodologie ML" du score CV

Ce qui est branché aujourd'hui dans `analyze-cv-ats` :

- **`ats_professions`** (17 thèmes parents, 0 profession enfant) sert à matcher l'offre et fournit `primary_keywords / secondary_keywords / soft_skills` au scoring sur 100 pts.
- **`job_title_clusters`** (table prévue pour auto-clusteriser les intitulés et faire émerger de nouveaux métiers) → **0 ligne**. Le code l'écrit en théorie mais la table reste vide en pratique (probablement bloqué par RLS / write path inutilisé côté public).
- **`ats_keyword_feedback`** : 334 entrées admin existent (reviews manuelles + AI). MAIS `analyze-cv-ats` ne les lit jamais : `rg` ne retrouve aucune référence à cette table dans la fonction de scoring. **Le "machine learning" ne reboucle donc pas** : les corrections faites en admin n'améliorent pas le score des utilisateurs suivants.
- **`cv_sector_phrases`** : 0 ligne. Sert au générateur de CV, pas au scoring.

Donc oui, la méthodologie est toujours d'actualité dans son intention, mais la boucle d'apprentissage est **rompue à deux endroits** : (a) les feedbacks admin ne sont pas réinjectés dans le scoring, (b) le clustering automatique des nouveaux intitulés n'écrit rien.

## 3. Améliorations proposées

### 3a. Réinjecter `ats_keyword_feedback` dans le scoring (le vrai gain ML)
Dans `analyze-cv-ats`, après avoir sélectionné la `profession` :
- charger `ats_keyword_feedback` où `profession_id = profession.id`
- pour chaque ligne `is_valid = true` : **promouvoir** le keyword dans la catégorie `corrected_category` (primary/secondary/soft) si absent
- pour chaque ligne `is_valid = false` : **exclure** le keyword de la liste correspondante
- pondération bonus : un keyword validé manuellement vaut +20% (multiplicateur sur le score partiel)

C'est la pièce manquante qui transforme les 334 reviews admin en amélioration concrète et continue de la précision.

### 3b. Réparer l'auto-clustering des intitulés
- À chaque analyse, écrire (upsert) dans `job_title_clusters` : `normalized_title`, `raw_title`, `occurrences++`, top-mots fréquents extraits de la job description.
- Quand `occurrences >= 5` et aucun `ats_professions` ne matche : créer automatiquement une `ats_professions` en `profession_status = 'pending_review'` avec le top-N des mots-clés extraits, rattachée au `parent_theme_id` le plus proche.
- Vérifier les RLS / GRANT sur `job_title_clusters` pour que la fonction (service_role) puisse réellement écrire — l'absence totale de lignes laisse soupçonner un blocage silencieux.

### 3c. Détecter et réduire les faux positifs hors-domaine
- Quand le top score profession est faible (< seuil) ou quand `topCandidates.length > 3`, baisser la confiance et annoter le résultat (`"profession non identifiée avec certitude"`) plutôt que de scorer avec un profil bancal.
- Logguer la décision (profession choisie, score, alternatives) dans une table légère `cv_analyses.metadata` pour permettre l'audit admin et un futur réentraînement.

### 3d. (Optionnel — étape suivante, pas dans ce ticket) Matching sémantique
- pgvector est déjà actif. Ajouter `embedding vector(1536)` sur `ats_professions` (concat name + keywords) et sur la job description normalisée, puis combiner cosine + score lexical actuel. À garder pour un second jet après validation de 3a/3b.

## 4. Détails techniques

Fichiers touchés :
- `supabase/functions/parse-cv-document/index.ts` → auth hybride + validation taille.
- `supabase/functions/analyze-cv-ats/index.ts` →
  - nouvelle fonction `applyKeywordFeedback(profession, feedbackRows)` avant le calcul de `keywordScore`,
  - upsert `job_title_clusters` après identification de la profession,
  - création conditionnelle d'une `ats_professions` `pending_review`,
  - enrichissement de la réponse avec `professionConfidence` et `feedbackApplied: number`.
- Migration éventuelle : index `idx_keyword_feedback_profession_valid` sur `(profession_id, is_valid)` pour accélérer la lecture à chaque analyse, et vérification des GRANT sur `job_title_clusters` pour `service_role`.

Pas de changement de schéma destructif, pas d'impact UI hormis un éventuel badge "Profession non identifiée avec certitude" dans `CVComparator` quand `professionConfidence` est faible.

## 5. Validation
- Charger un CV PDF en navigation privée sur `/score-cv` → import OK, score affiché.
- Lancer 5 analyses sur un nouvel intitulé → vérifier que `job_title_clusters` se peuple.
- Modifier un feedback admin (`is_valid=false`) sur un keyword bruyant et refaire une analyse → vérifier que le keyword n'apparaît plus dans le détail du score.
