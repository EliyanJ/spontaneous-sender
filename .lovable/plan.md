

# Enrichir la page ATS Training : data test + edition des thematiques

## Ce qui sera fait

### 1. Inserer des analyses de test dans "Analyses a revoir"

Inserer 5-6 fausses analyses CV dans la table `cv_analyses` pour pouvoir tester l'interface de revue. Elles couvriront differentes thematiques (Marketing, RH, Tech, Commercial) avec des scores varies et des mots-cles realistes.

### 2. Rendre les cartes "Thematiques" cliquables avec un panel d'edition complet

Quand tu cliques sur une thematique (ex: Marketing), un panel s'ouvre avec :

- **Edition de la categorie** (dropdown avec les categories existantes)
- **Edition des aliases** (champ texte, ajouter/supprimer)
- **Edition des Hard Skills (primary_keywords)** : liste modifiable, bouton "+" pour ajouter, "x" pour supprimer
- **Edition des Secondary Keywords** : idem
- **Edition des Soft Skills** : idem
- **Edition des Mots exclus (excluded_words)** : idem
- **Bouton Sauvegarder** pour persister les changements dans `ats_professions`

### 3. Import de mots-cles via fichier (PDF/TXT)

Sur le panel d'edition d'une thematique, un bouton "Importer des mots-cles" qui :
- Accepte un fichier PDF ou TXT
- Envoie le contenu a l'edge function `parse-cv-document` (deja existante) pour extraire le texte
- Utilise ensuite l'IA (`ats-ai-review` ou appel direct) pour identifier et categoriser les mots-cles extraits
- Affiche les mots-cles detectes avec la possibilite de valider/rejeter avant ajout

---

## Details techniques

### Fichiers modifies

| Fichier | Modification |
|---------|-------------|
| `src/pages/Admin/AdminATSTraining.tsx` | Ajout du panel d'edition thematique + import fichier + state management |

### Donnees de test (via insert tool)

Insertion de ~5 lignes dans `cv_analyses` avec des `analysis_result` JSON realistes contenant des `primaryKeywords.scores`, `secondaryKeywords.scores`, et `softSkills.scores`.

### Panel d'edition thematique

- Nouveau state `selectedProfession` pour stocker la thematique en cours d'edition
- Nouveau sous-onglet ou modal qui s'ouvre au clic sur une carte
- Champs editables pour chaque liste de mots-cles avec un pattern : affichage en badges + input pour ajouter + bouton supprimer
- Sauvegarde via `supabase.from("ats_professions").update(...)`

### Import fichier

- Input file accept `.pdf,.txt,.docx`
- Lecture en base64, envoi a `parse-cv-document` pour extraction texte
- Puis envoi du texte extrait a l'IA (via `ats-ai-review` adapte ou appel direct a Lovable AI) pour obtenir une liste categorisee
- Affichage dans une zone temporaire avec boutons Ajouter/Ignorer par mot-cle

### Ordre d'implementation

1. Inserer les donnees de test
2. Ajouter le panel d'edition des thematiques (clic sur carte -> edition inline)
3. Ajouter l'import de fichier avec extraction IA

