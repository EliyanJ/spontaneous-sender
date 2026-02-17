

# Onboarding post-inscription : personnalisation du profil

## Ce qui va etre cree

Un parcours en 4 etapes qui s'affiche automatiquement apres la premiere connexion. Il collecte les informations cles pour personnaliser l'experience de l'utilisateur.

### Les 4 etapes

1. **Vos objectifs** - "Que recherchez-vous ?" : stage, alternance, premier emploi, CDI/CDD, freelance (selection multiple)
2. **Secteur et metiers** - Selection du secteur d'activite (depuis la liste existante) + champ texte libre pour les metiers/postes vises
3. **Ce qui vous plait** - Centres d'interet professionnels : travail en equipe, autonomie, creativite, technique, international, management, etc. (tags cliquables)
4. **Votre CV** - Upload du CV (PDF/DOCX/TXT), parsing automatique par l'IA pour generer une synthese editable, stockage du fichier PDF pour l'envoyer en piece jointe dans les candidatures

### Fonctionnement

- Apres inscription et confirmation email, la premiere connexion redirige automatiquement vers `/onboarding`
- Tant que l'onboarding n'est pas termine, l'utilisateur ne peut pas acceder au dashboard
- La synthese du CV et le fichier PDF sont stockes dans le profil
- L'utilisateur peut refaire l'onboarding plus tard depuis les Parametres

---

## Details techniques

### 1. Migration base de donnees

Nouvelles colonnes dans la table `profiles` :

| Colonne | Type | Description |
|---------|------|-------------|
| `objective` | text | Objectif principal (stage, alternance...) |
| `target_sectors` | jsonb (default `[]`) | Secteurs d'activite vises |
| `target_jobs` | text | Metiers/postes vises (texte libre) |
| `professional_interests` | jsonb (default `[]`) | Centres d'interet pro |
| `cv_file_url` | text | URL du fichier CV dans le storage |
| `onboarding_completed` | boolean (default `false`) | Flag onboarding termine |

Creation d'un bucket prive `user-cvs` avec policies RLS :
- INSERT/SELECT/DELETE : uniquement dans le dossier `user_id/` de l'utilisateur

### 2. Nouveaux fichiers

| Fichier | Role |
|---------|------|
| `src/pages/Onboarding.tsx` | Page wizard avec barre de progression, navigation precedent/suivant |
| `src/components/onboarding/StepObjectives.tsx` | Etape 1 - Selection des objectifs |
| `src/components/onboarding/StepSectors.tsx` | Etape 2 - Secteurs + metiers vises |
| `src/components/onboarding/StepInterests.tsx` | Etape 3 - Interets professionnels |
| `src/components/onboarding/StepCV.tsx` | Etape 4 - Upload CV + synthese IA |

### 3. Fichiers modifies

| Fichier | Modification |
|---------|-------------|
| `src/App.tsx` | Ajout route `/onboarding` protegee |
| `src/components/ProtectedRoute.tsx` | Verification `onboarding_completed`, redirection vers `/onboarding` si `false` (exclut la route `/onboarding` elle-meme) |
| `src/components/dashboard/Settings.tsx` | Section CV (telecharger/re-uploader) + lien "Modifier mes preferences" vers `/onboarding` |

### 4. Etape CV - Detail du flux

1. L'utilisateur upload un fichier (drag & drop ou clic)
2. Le fichier est envoye dans le bucket `user-cvs` (dossier `user_id/`)
3. Le fichier est envoye a la edge function `parse-cv-document` (deja existante) pour extraction du texte
4. La synthese est affichee dans un textarea editable
5. A la validation : `cv_content` (synthese) et `cv_file_url` (lien storage) sont sauves dans `profiles`

### 5. Ordre d'implementation

1. Migration DB (colonnes + bucket storage)
2. Composants onboarding (4 etapes)
3. Page Onboarding.tsx (wizard)
4. ProtectedRoute (redirection)
5. App.tsx (route)
6. Settings.tsx (acces CV et re-onboarding)

