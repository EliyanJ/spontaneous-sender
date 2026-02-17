

# Corrections ATS : Detection permissive + UX post-analyse

## Problemes identifies

### 1. Sections obligatoires non detectees
La fonction `ortoflexFind` cherche des mots isoles avec des word boundaries (`\b`-like regex). Mais dans un CV extrait en texte brut, les titres de section apparaissent souvent :
- En MAJUSCULES : `EXPERIENCES PROFESSIONNELLES`
- Colles a d'autres mots : `Competences:gestion...`
- Avec des variantes non couvertes : `PARCOURS`, `LANGUES PARLEES`, `CERTIFICATIONS OBTENUES`
- Avec accents dans le texte brut : `Expériences`, `Compétences`

La solution : utiliser `normalizedCV.includes(keyword)` en plus du regex strict, et ajouter beaucoup plus de variantes de mots-cles pour chaque section.

### 2. Adresse : "Ile de France" non detectee
Actuellement seul le pattern code postal 5 chiffres est utilise (`\b\d{5}\b`). Il faut ajouter des noms de regions, villes et patterns courants francais.

### 3. UX : masquer le formulaire apres analyse + bouton "Refaire"
Apres l'analyse, le formulaire (fiche de poste + CV) prend trop de place. On doit :
- Masquer les cartes de saisie une fois les resultats affiches
- Afficher les resultats en pleine largeur
- Ajouter un bouton "Nouvelle analyse" pour reset tout

---

## Fichiers modifies

| Fichier | Modification |
|---------|-------------|
| `supabase/functions/analyze-cv-ats/index.ts` | Section detection plus permissive + adresse elargie |
| `src/components/dashboard/CVComparator.tsx` | Masquer formulaire apres analyse + bouton refaire |

---

## Details techniques

### Edge function - Section detection permissive (ETAPE 3)

Remplacer la detection actuelle par une double approche :
1. `normalizedCV.includes(keyword)` (substring simple)
2. `ortoflexFind(keyword, normalizedCV)` (regex avec variantes)
3. Si l'un des deux match, la section est trouvee

Nouvelles listes de mots-cles elargies :
- **Experiences** : `experience`, `experiences`, `experience professionnelle`, `experiences professionnelles`, `parcours`, `parcours professionnel`, `postes`, `emplois`, `historique professionnel`, `career`, `work history`
- **Competences** : `competence`, `competences`, `skills`, `savoir-faire`, `aptitudes`, `expertise`, `outils`, `technologies`, `tech`, `hard skills`
- **Formation** : `formation`, `formations`, `education`, `diplome`, `diplomes`, `cursus`, `etudes`, `scolarite`, `academic`, `qualification`
- **Langues/Certifications** : `langue`, `langues`, `certification`, `certifications`, `certificat`, `habilitation`, `langues parlees`, `languages`, `certifie`

### Edge function - Adresse elargie (ETAPE 1)

Ajouter a la detection d'adresse :
- Noms de regions : `ile de france`, `ile-de-france`, `auvergne`, `bretagne`, `normandie`, `occitanie`, `paca`, `provence`, etc.
- Noms de grandes villes : `paris`, `lyon`, `marseille`, `toulouse`, `bordeaux`, `nantes`, `lille`, `strasbourg`, `montpellier`, `rennes`, `nice`, `grenoble`, etc.
- Patterns : code postal 5 chiffres OU nom de region/ville connu

### Frontend - UX post-analyse

Quand `result` est non-null :
- Les deux cartes de saisie (fiche de poste + CV) disparaissent
- Les resultats s'affichent en pleine largeur (plus de grid 2 colonnes)
- Un bouton "Nouvelle analyse" en haut des resultats reset `result`, `cvText`, `cvFile`, `jobTitle`, `jobDescription` pour revenir au formulaire

