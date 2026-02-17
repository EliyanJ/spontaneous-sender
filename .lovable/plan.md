
# Refonte de l'algorithme ATS - Scoring equilibre et realiste

## Probleme identifie

Le score actuel de 8/100 vient de plusieurs defauts majeurs :

1. **Dependance excessive a la base de metiers** : Si la fiche de poste ne matche pas bien un metier pre-defini, les 75 points (50 primaires + 25 secondaires) sont quasi-perdus
2. **Ratio d'occurrences trop strict** : Si "SEO" apparait 8 fois dans la fiche mais 3 dans le CV, le score est 3/8 = 37% des points seulement
3. **Aucun point positif pour les bonnes pratiques** : Le concurrent accorde des points pour les infos de contact, le resume/profil, le formatage des dates, les resultats mesurables, le nombre de mots, etc.
4. **Trop de malus empiles** : -8 intitule + -6 contrat + -15 sections = deja -29 points perdus facilement

## Nouvelle approche - Hybride (base de metiers + extraction directe)

Le nouveau scoring s'inspire du concurrent tout en gardant la logique de ton algorithme original. L'idee principale : **extraire les mots-cles directement de la fiche de poste en plus de la base de metiers**, et ajouter des dimensions positives.

### Nouvelle repartition des 100 points

| Categorie | Points | Description |
|-----------|--------|-------------|
| Mots-cles techniques (hard skills) | 30 pts | Extraction directe depuis fiche de poste + base metiers |
| Mots-cles secondaires / transversaux | 15 pts | Idem, logique mixte |
| Soft skills | 10 pts | Detection dans CV vs fiche |
| Informations de contact | 10 pts | Email, telephone, adresse, LinkedIn |
| Section Resume/Profil | 5 pts | Presence d'un resume ou profil en haut du CV |
| Sections obligatoires | 10 pts | Experiences, Competences, Formation, Education |
| Resultats mesurables | 5 pts | Chiffres, pourcentages, KPIs dans le CV |
| Nombre de mots | 5 pts | Entre 400 et 1200 mots = optimal |
| Intitule du poste | 5 pts | Presence dans le CV (malus reduit de -8 a -5) |
| Type de contrat | 5 pts | Presence dans le CV (malus reduit de -6 a -5) |
| **Total base** | **100 pts** | |
| Bonus proximite | +6 max | Mots secondaires proches des primaires |
| Bonus mots-cles extra | +1.5/mot | Mots au-dela du top classement |

### Changements cles dans l'algorithme

**1. Extraction hybride des mots-cles**
Au lieu de se baser uniquement sur la base `ats_professions`, on va aussi extraire les mots significatifs directement de la fiche de poste (mots de 4+ caracteres, filtrage des stop words francais). Les mots qui apparaissent dans la base de metiers ET dans la fiche de poste comptent double.

**2. Scoring plus genereux**
- Si un mot-cle est present au moins 1 fois dans le CV, il obtient minimum 50% des points (au lieu de 0 si le ratio est faible)
- Formule : `score = (0.5 + 0.5 * min(1, occ_cv / occ_fiche)) * pointsMax`
- Cela signifie que meme une seule mention donne la moitie des points

**3. Nouvelles dimensions de scoring**
- **Contact info (10 pts)** : Detection de patterns email, telephone, adresse, LinkedIn/site web
- **Resume/Profil (5 pts)** : Detection de section "Profil", "Resume", "A propos", "Objectif"
- **Resultats mesurables (5 pts)** : Comptage de chiffres/pourcentages/metriques dans le CV
- **Word count (5 pts)** : Verification que le CV a un nombre de mots raisonnable

**4. Sections obligatoires plus souples (10 pts au lieu de -15)**
Au lieu de retirer 5 points par section manquante, on donne 2.5 points par section trouvee parmi : Experiences, Competences, Formation, Education. Cela rend le scoring positif.

**5. Malus reduits**
- Intitule du poste : -5 au lieu de -8
- Type de contrat : -5 au lieu de -6
- Images : -5 (inchange)

### Impact attendu

Pour un CV correct (avec contact, profil, sections, quelques mots-cles) :
- Contact: ~8/10
- Resume: 5/5
- Sections: ~7.5/10
- Keywords: ~15-20/30 (au lieu de ~3/50 avec l'ancien ratio)
- Soft skills: ~5/10
- Resultats mesurables: ~3/5
- Word count: ~5/5
- Intitule + contrat: variable
- **Total estime: ~50-65/100** (au lieu de 8)

Cela s'aligne avec le 57% du concurrent.

## Fichiers modifies

| Fichier | Modification |
|---------|-------------|
| `supabase/functions/analyze-cv-ats/index.ts` | Rewrite complet de l'algorithme avec les nouvelles dimensions |
| `src/components/dashboard/CVComparator.tsx` | Ajout des nouvelles sections de resultats (contact, resume, dates, word count) |

## Detail technique de l'edge function

```text
ETAPE 0 : Qualite d'extraction
  - Si < 100 caracteres hors espaces : warning

ETAPE 1 : Informations de contact (10 pts)
  - Email detecte : +3 pts (regex pattern)
  - Telephone detecte : +3 pts (regex 06/07/+33)
  - Adresse/ville detectee : +2 pts (pattern code postal)
  - LinkedIn ou site web : +2 pts (regex URL/linkedin)

ETAPE 2 : Section Resume/Profil (5 pts)
  - Chercher "Profil", "Resume", "A propos", "Objectif", "Presentation" avec ORTOFLEX
  - Si trouvee : +5 pts

ETAPE 3 : Sections obligatoires (10 pts = 2.5 pts x 4)
  - Experiences/Experience professionnelle : 2.5 pts
  - Competences : 2.5 pts
  - Formation/Education : 2.5 pts
  - Langues ou Certifications (bonus section) : 2.5 pts

ETAPE 4 : Identification du metier (inchange)
  - Matching avec ats_professions

ETAPE 5 : Hard skills / mots-cles techniques (30 pts)
  - Extraction HYBRIDE : mots-cles de la base metier + extraction directe de la fiche
  - Top 10 mots = 3 pts chacun
  - Formule genereuse : present >= 1 fois = min 50% des points
  - Bonus +1.5 pour les mots au-dela du top 10

ETAPE 6 : Mots-cles secondaires (15 pts)
  - Top 5 = 3 pts chacun
  - Meme formule genereuse

ETAPE 7 : Soft skills (10 pts)
  - Distribution des 10 pts sur les soft skills detectes

ETAPE 8 : Resultats mesurables (5 pts)
  - Compter les nombres/pourcentages/metriques dans le CV
  - 0 resultats : 0 pts, 1-2 : 2 pts, 3-4 : 3 pts, 5+ : 5 pts

ETAPE 9 : Nombre de mots (5 pts)
  - < 200 mots : 1 pt, 200-400 : 3 pts, 400-1200 : 5 pts, > 1200 : 3 pts

ETAPE 10 : Intitule du poste (5 pts / -5 malus)
  - Meme logique ORTOFLEX mais malus reduit a -5

ETAPE 11 : Type de contrat (5 pts / -5 malus)
  - Meme logique mais malus reduit a -5

ETAPE 12 : Verification images (-5 si > 5 images)

ETAPE 13 : Bonus proximite (+2 x 3 max = +6)
```

## Frontend - Nouvelles sections affichees

Apres le camembert de score, dans l'ordre :
1. **Informations de contact** - checkmarks pour email, tel, adresse, web
2. **Resume/Profil** - check ou croix
3. **Sections obligatoires** - checkmarks par section
4. **Metier identifie** - badge
5. **Competences techniques** - badges avec scores
6. **Competences transversales** - badges
7. **Soft skills** - badges
8. **Resultats mesurables** - compteur
9. **Nombre de mots** - indicateur
10. **Intitule du poste** - check ou croix
11. **Type de contrat** - check ou croix
12. **Images** - check ou croix
