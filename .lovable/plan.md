
# CV Builder - Createur de CV Sectoriel avec IA

## Vue d'ensemble

Nouvelle page `/cv-builder` accessible depuis le dashboard (nouvel onglet "CV Builder" dans la navigation). L'utilisateur peut creer un CV professionnel type Finance, Marketing, Tech, etc. a partir de ses donnees existantes, avec generation de phrases IA adaptees au secteur et adaptation automatique a une fiche de poste.

## Architecture generale

```text
+------------------+     +------------------+     +------------------+
|   CV existant    |     |  Fiche de poste  |     |  Base phrases    |
|  (PDF/DOCX/txt)  |     |  (optionnel)     |     |  sectorielles    |
+--------+---------+     +--------+---------+     +--------+---------+
         |                        |                        |
         v                        v                        v
+--------+---------+     +--------+---------+     +--------+---------+
| parse-cv-document|     | analyze-cv-ats   |     |  cv_sector_data  |
| (existant)       |     | (existant)       |     |  (nouvelle table)|
+--------+---------+     +--------+---------+     +--------+---------+
         |                        |                        |
         +------------+-----------+------------------------+
                      |
                      v
         +------------+-------------+
         |  generate-cv-content     |
         |  (nouvelle edge function)|
         +------------+-------------+
                      |
                      v
         +------------+-------------+
         |   CV Builder UI          |
         |   - Formulaire structuré |
         |   - Preview A4 live      |
         |   - Export PDF           |
         +------------+-------------+
```

## Etape 1 : Base de donnees

### Nouvelle table `cv_templates`
Stocke les templates HTML/CSS par secteur.

| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid | PK |
| name | text | "Finance", "Marketing", "Tech"... |
| sector | text | Secteur cible |
| html_template | text | Template HTML avec placeholders ({{name}}, {{title}}, etc.) |
| css_styles | text | CSS specifique au template |
| thumbnail_url | text | Apercu miniature |
| is_active | boolean | Actif ou non |
| created_at | timestamptz | Date creation |

RLS : Lecture publique pour les utilisateurs authentifies, ecriture admin uniquement.

### Nouvelle table `cv_sector_phrases`
Base de phrases optimisees par secteur pour nourrir l'IA.

| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid | PK |
| sector | text | "finance", "marketing", "tech"... |
| category | text | "experience", "competence", "accroche", "objectif" |
| phrase | text | La phrase modele |
| context | text | Dans quel contexte utiliser cette phrase |
| keywords | jsonb | Mots-cles associes |
| created_at | timestamptz | Date creation |

RLS : Lecture pour utilisateurs authentifies, ecriture admin uniquement.

### Nouvelle table `user_generated_cvs`
Sauvegarde des CVs generes par les utilisateurs.

| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid | PK |
| user_id | uuid | Proprietaire |
| template_id | uuid | FK vers cv_templates |
| name | text | Nom du CV ("Mon CV Finance") |
| cv_data | jsonb | Donnees structurees du CV (nom, titre, experiences, etc.) |
| generated_html | text | HTML final genere |
| job_description | text | Fiche de poste utilisee (optionnel) |
| ats_score | numeric | Score ATS si analyse faite |
| created_at | timestamptz | |
| updated_at | timestamptz | |

RLS : CRUD pour le proprietaire uniquement.

## Etape 2 : Edge Function `generate-cv-content`

Nouvelle edge function qui utilise l'IA (Lovable AI Gateway) pour :

1. **Structurer un CV brut** : Prend le texte du CV parse et extrait les donnees structurees (nom, titre, experiences avec dates/entreprise/description, formation, competences, langues)
2. **Generer des phrases optimisees** : En fonction du secteur cible et de la base `cv_sector_phrases`, reformule les descriptions d'experience pour etre percutantes
3. **Adapter a une fiche de poste** : Si une fiche de poste est fournie, integre les mots-cles manquants (issus du comparatif ATS) dans les reformulations

L'IA recoit :
- Le texte brut du CV
- Le secteur cible
- Les phrases modeles du secteur (depuis `cv_sector_phrases`)
- Optionnellement : la fiche de poste + les mots-cles manquants du score ATS

Elle retourne un objet JSON structure :
```text
{
  personalInfo: { firstName, lastName, title, email, phone, address, linkedin },
  summary: "...",
  experiences: [{ company, role, dates, bullets: [...] }],
  education: [{ school, degree, dates }],
  skills: { technical: [...], soft: [...] },
  languages: [...],
  sectorKeywords: [...]
}
```

## Etape 3 : Interface utilisateur (CV Builder Page)

### 3.1 Ecran d'accueil : Choix du mode

Deux cartes glassmorphisme :

- **"Creer un CV"** : Partir de zero ou d'un CV existant
- **"Adapter a une offre"** : Importer un CV + une fiche de poste pour generer un CV optimise

### 3.2 Formulaire structure (Step 1)

Apres import du CV (ou saisie manuelle), l'utilisateur voit un formulaire editable en sections :

- **Informations personnelles** : Prenom, Nom, Titre, Email, Telephone, Adresse, LinkedIn
- **Accroche / Resume** : Textarea avec bouton "Regenerer avec IA"
- **Experiences** : Liste editable avec company, role, dates, bullets. Bouton "Optimiser cette experience" par bloc
- **Formation** : Liste editable
- **Competences** : Tags editables (techniques + soft skills)
- **Langues** : Liste

Chaque section a un bouton "IA" qui reformule le contenu pour le secteur choisi.

### 3.3 Choix du template (Step 2)

Grille de templates disponibles (Finance, Marketing, Tech...) avec preview miniature. L'utilisateur clique pour selectionner.

Pour commencer : on implemente 1 template "Finance/Corporate" base sur le HTML que tu m'as fourni (mise en page A4 avec colonnes, typo serif/sans-serif, couleurs sobres bleu fonce).

### 3.4 Preview live A4 (Step 3)

Panneau split :
- **Gauche** : Formulaire editable (compact)
- **Droite** : Preview A4 en temps reel qui se met a jour quand on modifie les champs

Le preview utilise un `<div>` avec des dimensions A4 (210mm x 297mm) et le CSS du template choisi. Le contenu est injecte via les donnees structurees.

### 3.5 Export

- **Impression navigateur** (`window.print()`) avec CSS `@media print` pour generer un PDF propre
- Sauvegarde du CV dans `user_generated_cvs` pour le retrouver plus tard

## Etape 4 : Integration avec le systeme ATS existant

Le flux "Adapter a une offre" :

1. L'utilisateur importe son CV + colle une fiche de poste
2. Le systeme lance `analyze-cv-ats` pour obtenir le score et les mots-cles manquants
3. Ces donnees sont passees a `generate-cv-content` qui reformule le CV en integrant les mots-cles manquants
4. L'utilisateur voit le CV adapte avec les ameliorations en surbrillance
5. Il peut accepter/rejeter chaque suggestion avant d'exporter

## Etape 5 : Admin - Gestion des phrases sectorielles

Dans le panel admin existant, nouvel onglet pour gerer `cv_sector_phrases` :
- Ajouter/modifier/supprimer des phrases par secteur et categorie
- Importer en lot (CSV ou via IA)
- Voir quelles phrases sont les plus utilisees

## Fichiers a creer / modifier

| Fichier | Action |
|---------|--------|
| `src/pages/CVBuilder.tsx` | Creer - Page principale du CV Builder |
| `src/components/cv-builder/CVBuilderForm.tsx` | Creer - Formulaire structure |
| `src/components/cv-builder/CVPreview.tsx` | Creer - Preview A4 live |
| `src/components/cv-builder/TemplateSelector.tsx` | Creer - Grille de selection de templates |
| `src/components/cv-builder/SectionEditor.tsx` | Creer - Editeur de section avec IA |
| `src/components/cv-builder/CVBuilderIntro.tsx` | Creer - Ecran d'accueil avec choix du mode |
| `supabase/functions/generate-cv-content/index.ts` | Creer - Edge function IA |
| `src/App.tsx` | Modifier - Ajouter route `/cv-builder` |
| `src/pages/Index.tsx` | Modifier - Ajouter onglet "CV Builder" dans la nav |
| `src/components/HorizontalNav.tsx` | Modifier - Ajouter item navigation |
| Migration SQL | Tables `cv_templates`, `cv_sector_phrases`, `user_generated_cvs` + RLS |

## Ordre d'implementation recommande

1. Migration DB (tables + RLS)
2. Edge function `generate-cv-content`
3. Page CVBuilder + composants UI (formulaire, preview, templates)
4. Integration route + navigation
5. Integration avec ATS existant (flux "adapter a une offre")
6. Admin phrases sectorielles (iteration future)

## Template Finance initial

Le template sera inspire du CV HTML fourni : layout A4 epure, police professionnelle, en-tete avec nom et titre en grand, sections clairement delimitees avec lignes de separation, couleurs sobres (bleu fonce, gris). Le CSS sera pur (pas de Tailwind dans le template) pour garantir un rendu fidele a l'impression PDF.
