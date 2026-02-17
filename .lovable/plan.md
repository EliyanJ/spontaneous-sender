

# Comparateur CV / Score ATS - Admin Only

## Resume

Creation d'un nouvel onglet "Score CV" dans le dashboard, accessible uniquement aux admins. L'utilisateur colle une fiche de poste, upload un CV, et l'algorithme compare les deux pour produire un score sur 100 points avec des resultats visuels (camembert, listes detaillees).

---

## Architecture

### 1. Base de donnees - Table `ats_professions`

Table contenant la "Grande base de donnees" des metiers avec leurs mots-cles :

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | uuid | PK |
| `name` | text | Nom du metier (ex: "Marketing digital") |
| `primary_keywords` | jsonb | Liste de mots-cles principaux (ex: ["SEO", "SEA", "Google Ads"]) |
| `secondary_keywords` | jsonb | Liste de mots-cles secondaires (ex: ["Coordination", "Planification"]) |
| `soft_skills` | jsonb | Liste de soft skills (ex: ["Autonomie", "Organisation"]) |
| `created_at` | timestamptz | Date creation |

RLS : lecture pour les utilisateurs authentifies, ecriture pour les admins uniquement.

Seed initial avec environ 15-20 metiers courants :
- Marketing digital, Developpement web, Ressources humaines, Commerce/Vente, Finance/Comptabilite, Communication, Data/Analytics, Design graphique, Gestion de projet, Logistique/Supply chain, Droit/Juridique, Informatique/Systemes, Ingenierie, Assistanat/Administratif, Community Management, etc.

Chaque metier aura 20-30 mots-cles principaux, 15-20 secondaires, et 10-15 soft skills.

### 2. Edge function `analyze-cv-ats`

Fonction backend qui execute l'algorithme complet :

**Entrees** : CV (texte extrait), fiche de poste (texte), intitule du poste (texte)

**Etapes de l'algorithme** :

```text
ETAPE 1 : Verification des sections obligatoires (-5pts par section manquante)
   - Cherche "Experiences", "Competences", "Formation" avec ORTOFLEX
   - ORTOFLEX = case-insensitive + accents ignores + tolerance sur pluriel
   - Penalite uniquement si faute d'orthographe grammaticale reelle

ETAPE 2 : Identification du metier
   - Extraire tous les mots de la fiche de poste
   - Comparer avec chaque metier de ats_professions
   - Compter les correspondances de mots-cles principaux
   - Cross-check avec l'intitule du poste fourni par l'utilisateur
   - En cas d'ambiguite, choisir aleatoirement parmi les meilleurs

ETAPE 3 : Scoring mots-cles principaux (50 points)
   - Classer les mots-cles principaux du metier identifie par occurrences dans la fiche de poste
   - Top 10 = 5 points chacun (score = min(1, occ_cv / occ_fiche) * 5)
   - Au-dela du top 10 : bonus +1.5 si present au moins 1 fois dans CV et fiche
   - Score cap a 1 chiffre apres la virgule

ETAPE 4 : Scoring mots-cles secondaires (25 points)
   - Meme logique que principaux, top 5 a 5 points chacun
   - Bonus +1.5 pour les mots au-dela du top 5

ETAPE 5 : Scoring soft skills (14 points)
   - Top soft skills du metier identifies dans fiche de poste
   - Repartition des 14 points sur les soft skills trouves

ETAPE 6 : Verification images (5 points)
   - Detecter les references a des images (png, jpg, jpeg, gif, svg, image)
   - Si plus de 5 references : -5 points

ETAPE 7 : Bonus proximite (+2pts x3 max = +6pts plafonnes)
   - Verifier si des mots secondaires sont a moins de 50 caracteres de mots principaux
   - +2 points par occurrence, max 3 fois

ETAPE 8 : Malus intitule du poste (-8 points)
   - Filtrer l'intitule : supprimer mots < 3 caracteres SAUF exceptions (IA, RH, IT, QA, UX, UI...)
   - Verifier si la phrase filtree est presente dans le CV
   - Si absente : -8 points

ETAPE 9 : Malus type de contrat (-6 points)
   - Chercher "Stage", "CDI", "CDD", "Alternance", "Apprentissage", "Professionnalisation"
   - Avec ORTOFLEX
   - Si aucun present : -6 points
   - Cumulable avec malus intitule

ETAPE 10 : Verification qualite extraction
   - Si < 100 caracteres hors espaces : erreur extraction defaillante
```

**Sortie** : JSON complet avec score total, detail de chaque etape, listes de mots-cles trouves/manquants, metier identifie, et tous les indicateurs pour le frontend.

### 3. Frontend - Composant `CVComparator.tsx`

**Interface en 2 parties** :

**Formulaire (partie gauche/haut)** :
- Champ texte : Intitule du poste
- Textarea : Coller la fiche de poste
- Upload CV (PDF/DOCX/TXT) - reutilise le parse-cv-document existant
- 1 seul bouton "Analyser"

**Resultats (partie droite/bas)** :
- Camembert circulaire (recharts PieChart) avec score au centre
  - Vert > 70 points, Orange 40-70, Rouge < 40
- Sections detaillees dans l'ordre :
  1. Sections obligatoires (checkmarks/croix)
  2. Metier identifie
  3. Competences techniques (principaux) avec icones
  4. Competences transversales (secondaires)
  5. Soft skills
  6. Verification images
  7. Intitule du poste
  8. Type de contrat
  9. Alerte extraction si defaillante

### 4. Integration dans le dashboard

**Fichiers modifies** :

| Fichier | Modification |
|---------|-------------|
| `src/pages/Index.tsx` | Ajout case "cv-score" dans renderContent + tabOrder, import CVComparator |
| `src/components/HorizontalNav.tsx` | Ajout bouton "Score CV" visible uniquement si isAdmin |
| `src/components/MobileNav.tsx` | Ajout entree "Score CV" dans le menu mobile, admin only |

**Nouveaux fichiers** :

| Fichier | Role |
|---------|------|
| `src/components/dashboard/CVComparator.tsx` | Composant principal avec formulaire + resultats |
| `src/lib/ats-professions-seed.ts` | Donnees de seed pour les metiers (utilise dans la migration SQL) |
| `supabase/functions/analyze-cv-ats/index.ts` | Edge function avec l'algorithme complet |

### 5. Detail de la fonction ORTOFLEX

```text
ORTOFLEX(mot_cherche, texte):
  1. Normaliser : lowercase + supprimer accents (e, e, e -> e)
  2. Generer variantes : pluriel (s/es), feminin (e), etc.
  3. Chercher chaque variante dans le texte normalise
  4. Retourner TRUE si une variante est trouvee
  5. Ne PAS matcher si la difference est une lettre en trop/manquante
     (ex: "Competnces" != "Competences")
```

### 6. Ordre d'implementation

1. Migration DB : table `ats_professions` + seed des metiers
2. Edge function `analyze-cv-ats` avec tout l'algorithme
3. Composant `CVComparator.tsx` avec formulaire + graphiques recharts
4. Integration dans Index.tsx, HorizontalNav.tsx, MobileNav.tsx (admin only)

