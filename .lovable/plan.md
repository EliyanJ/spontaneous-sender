
# Onboarding post-inscription : etapes de personnalisation du profil

## Objectif

Creer un parcours d'onboarding en plusieurs etapes qui s'affiche apres la premiere connexion de l'utilisateur. Ce parcours collecte des informations cles pour personnaliser l'experience : objectifs, secteur d'activite, metiers vises, et upload du CV (avec synthese IA et stockage du PDF).

## Architecture

### Flux utilisateur

```text
Inscription -> Confirmation email -> Connexion -> /onboarding (si pas complete) -> /dashboard
```

Le `ProtectedRoute` verifiera si l'onboarding est complete. Si non, redirection vers `/onboarding`.

### Etapes du wizard (4 etapes)

1. **Objectifs** : "Que recherchez-vous ?" (stage, alternance, premier emploi, CDI, freelance...)
2. **Secteur & Metiers** : Secteur d'activite prefere + metiers/postes vises (champ texte libre)
3. **Ce qui vous plait** : Centres d'interet professionnels (travail en equipe, autonomie, creativite, international...)
4. **CV** : Upload du CV (PDF/DOCX) avec parsing IA pour generer une synthese, et apercu de la synthese avant validation

---

## Modifications base de donnees

### Migration SQL - Nouvelles colonnes dans `profiles`

Ajouter les colonnes suivantes a la table `profiles` :

- `objective` (text) : objectif principal (stage, alternance, emploi...)
- `target_sectors` (jsonb, default '[]') : liste des secteurs d'activite vises
- `target_jobs` (text) : metiers/postes vises (texte libre)
- `professional_interests` (jsonb, default '[]') : centres d'interet professionnels
- `cv_file_url` (text) : URL du fichier CV stocke dans le bucket storage
- `onboarding_completed` (boolean, default false) : flag pour savoir si l'onboarding est termine

### Storage - Bucket pour les CV

Creer un bucket `user-cvs` (prive) pour stocker les fichiers CV des utilisateurs, avec des policies RLS :
- INSERT : l'utilisateur peut uploader dans son propre dossier (`user_id/`)
- SELECT : l'utilisateur peut lire ses propres fichiers
- DELETE : l'utilisateur peut supprimer ses propres fichiers

---

## Nouveaux fichiers

### `src/pages/Onboarding.tsx`

Page principale du wizard d'onboarding avec :
- Barre de progression (4 etapes)
- Navigation Precedent/Suivant
- Sauvegarde incrementale a chaque etape
- A la derniere etape, met `onboarding_completed = true` et redirige vers `/dashboard`

### `src/components/onboarding/StepObjectives.tsx`

Etape 1 - Selection multiple parmi :
- Stage
- Alternance
- Premier emploi
- CDI / CDD
- Freelance / Mission

### `src/components/onboarding/StepSectors.tsx`

Etape 2 - Utilise les secteurs existants de `src/lib/activity-sectors.ts` pour la selection, plus un champ texte libre pour les metiers/postes vises.

### `src/components/onboarding/StepInterests.tsx`

Etape 3 - Selection multiple parmi des tags predefinits (travail en equipe, autonomie, creativite, technique, international, management, etc.) + champ "Autre" optionnel.

### `src/components/onboarding/StepCV.tsx`

Etape 4 - Zone d'upload drag & drop pour le CV (PDF, DOCX, TXT). Apres upload :
1. Le fichier est envoye au bucket `user-cvs`
2. Le fichier est parse via la edge function existante `parse-cv-document`
3. La synthese est affichee a l'utilisateur dans un textarea editable
4. L'utilisateur peut valider/modifier avant de sauvegarder
5. Le `cv_content` (synthese) et `cv_file_url` (lien storage) sont sauves dans `profiles`

---

## Modifications aux fichiers existants

### `src/App.tsx`

- Ajouter la route `/onboarding` protegee

### `src/components/ProtectedRoute.tsx`

- Apres verification de l'auth, verifier si `onboarding_completed` est `true`
- Si non, rediriger vers `/onboarding`
- Exclure la route `/onboarding` elle-meme de cette verification (pour eviter une boucle)

### `src/components/dashboard/Settings.tsx`

- Dans la section Profil, ajouter un lien "Modifier mes objectifs et preferences" qui redirige vers `/onboarding` (pour permettre de refaire l'onboarding)
- Ajouter une section CV : afficher le CV actuel (lien de telechargement), possibilite d'en uploader un nouveau

---

## Resume des fichiers

| Fichier | Action |
|---------|--------|
| Migration SQL | Ajouter colonnes profiles + bucket user-cvs |
| `src/pages/Onboarding.tsx` | Nouveau - wizard principal |
| `src/components/onboarding/StepObjectives.tsx` | Nouveau - etape 1 |
| `src/components/onboarding/StepSectors.tsx` | Nouveau - etape 2 |
| `src/components/onboarding/StepInterests.tsx` | Nouveau - etape 3 |
| `src/components/onboarding/StepCV.tsx` | Nouveau - etape 4 |
| `src/App.tsx` | Modifier - ajouter route /onboarding |
| `src/components/ProtectedRoute.tsx` | Modifier - redirection onboarding |
| `src/components/dashboard/Settings.tsx` | Modifier - section CV + lien onboarding |

## Ordre d'implementation

1. Migration DB (colonnes + bucket storage)
2. Composants onboarding (4 etapes)
3. Page Onboarding.tsx (wizard)
4. ProtectedRoute (redirection)
5. App.tsx (route)
6. Settings.tsx (acces CV et re-onboarding)
