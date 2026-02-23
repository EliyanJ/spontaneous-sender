

# Refonte de la Homepage selon la maquette UX Pilot

## Vue d'ensemble

Remplacement complet du contenu de `src/pages/Landing.tsx` pour correspondre au nouveau design wireframe. La structure reste similaire mais avec des changements visuels importants.

## Changements principaux par section

### 1. Header
- Quasiment identique, pas de changement majeur.

### 2. Hero Section
- Ajout d'un **bouton secondaire "Voir la démo"** a cote du CTA principal
- Ajout d'un **mockup de dashboard** dans un cadre navigateur (browser frame) sous le hero -- c'est le gros changement visuel. Ce sera un composant stylise en CSS representant une interface de dashboard (fausse UI decorative)

### 3. "A qui s'adresse Cronos ?"
- Sous-titre change : "Une solution adaptee a chaque etape de votre parcours professionnel"
- Cards legerement redesignees, meme contenu

### 4. "Comment ca marche ?"
- Badge "PROCESSUS SIMPLE" au-dessus du titre
- **Layout en timeline visuelle** avec lignes de connexion entre les etapes (au lieu de la liste verticale actuelle)
- Alternance gauche/droite des etapes avec des illustrations/mockups a cote de chaque etape
- 4 etapes avec le meme contenu mais presentation en zigzag

### 5. "Fonctionnalites Puissantes"
- Nouveau sous-titre : "Tout ce dont tu as besoin pour automatiser ta recherche."
- Grille 4 colonnes avec cards redesignees (icone, titre, 3 bullet points)
- Contenu similaire mais renomme (ex: "Recherche & Collecte" au lieu de "Prospection intelligente")

### 6. "Pourquoi choisir Cronos ?"
- Tableau comparatif redesigne dans un style plus propre avec colonnes "Cronos" vs "Classique"
- Indicateurs visuels (cercles colores) au lieu de check/X
- Header "FONCTIONNALITE | Cronos | Classique"

### 7. Barre de statistiques
- **Nouvelle section** : bande gradient avec les stats (-90%, x20, +45%, infini) affichees en gros avec labels en dessous
- Remplace la section "Resultats concrets" actuelle

### 8. Social proof
- Logos partenaires (AWS, Web Summit, Google, etc.) sous les stats numeriques
- Meme structure que l'actuelle

### 9. Tarification
- Titre "Tarification Simple" avec sous-titre
- 3 cartes : Gratuit (0 EUR), Standard (14 EUR/mois), Premium (39 EUR/mois)
- Badge "Premium" sur la carte Premium (au lieu de "Populaire")
- Boutons differencies : "Commencer gratuitement" / "Choisir Standard" / "Devenir Premium"
- Liens en bas : "Besoin de plus de credits ?" et switch FR/EN

### 10. CTA Final
- Meme structure, texte identique

### 11. Footer
- Structure similaire avec copyright mis a jour

## Details techniques

### Fichier modifie

| Fichier | Action |
|---------|--------|
| `src/pages/Landing.tsx` | Reecriture complete du composant avec le nouveau design |

### Elements de design cles a implementer

1. **Browser frame mockup** : un `div` style avec barre d'adresse (3 dots rouge/jaune/vert), simulant un screenshot de dashboard. Contenu en CSS pur (fausses lignes, boutons decoratifs)

2. **Timeline zigzag** : layout alternant `flex-row` et `flex-row-reverse` pour les etapes, avec une ligne verticale pointillee au centre

3. **Barre de stats gradient** : section pleine largeur avec fond degrade (indigo vers violet) et les 4 metriques en gros

4. **Tableau comparatif** : utilisation de la composante `Table` existante avec style personnalise, indicateurs en pastilles colorees

### Ce qui ne change PAS
- Les imports et hooks existants (useAuth, useNavigate, theme toggle)
- La logique de redirection si l'utilisateur est connecte
- Le footer et ses liens
- Les prix (synchronises avec stripe-config.ts : 0 EUR, 14 EUR, 39 EUR)
- La navigation header

