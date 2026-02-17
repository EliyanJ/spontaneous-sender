

# Chatbot IA + Ticket Support en bas a droite

## Vue d'ensemble

Transformer la bulle d'aide actuelle (HelpBubble) en un widget double : l'utilisateur peut soit discuter avec un chatbot IA qui connait toute l'application, soit soumettre un ticket de support classique. Le chatbot utilise Lovable AI (Gemini) avec un system prompt exhaustif contenant toute la base de connaissances de l'application.

---

## Architecture

Le widget en bas a droite ouvre un panneau avec 2 onglets :
- **Assistant IA** : chatbot streaming qui repond aux questions
- **Ticket** : formulaire de ticket existant (inchange)

La "base de donnees" de connaissances sera un system prompt detaille dans l'edge function, pas une table SQL. C'est la methode la plus efficace : l'IA a tout le contexte en memoire sans avoir besoin de recherche vectorielle.

---

## Fichiers a creer

| Fichier | Role |
|---------|------|
| `supabase/functions/chatbot-assistant/index.ts` | Edge function avec system prompt + streaming via Lovable AI |
| `src/components/ChatbotWidget.tsx` | Nouveau widget avec onglets Chat / Ticket |

## Fichiers a modifier

| Fichier | Modification |
|---------|-------------|
| `src/components/HelpBubble.tsx` | Remplace par le nouveau ChatbotWidget |
| `supabase/config.toml` | Ajouter config pour chatbot-assistant |

---

## Details techniques

### 1. Edge function `chatbot-assistant`

System prompt contenant toute la base de connaissances structuree :

**Cronos - Presentation generale**
- Plateforme de recherche d'entreprises et de candidature spontanee
- Permet de trouver des entreprises, obtenir leurs emails, envoyer des candidatures par email
- 3 plans : Gratuit (5 envois/mois), Standard 14EUR (100 envois), Premium 39EUR (400 envois + IA)

**Fonctionnalites par onglet**
- Recherche : trouver des entreprises par secteur, localisation, effectif (base gouvernementale)
- Entreprises : liste des entreprises sauvegardees, gestion du pipeline
- Emails : recherche de contacts email via hunter.io, envoi de candidatures
- Campagnes : envoi groupe, suivi des relances automatiques, detection de reponses
- Offres d'emploi : acces aux offres France Travail (Premium uniquement)
- Score CV : analyse ATS de votre CV vs une fiche de poste
- Parametres : profil, preferences, templates, connexion Gmail

**Comment ca marche**
- Recherche automatique : filtrer par departement/region + secteur d'activite
- Recherche IA (Premium) : decrire en langage naturel ce que vous cherchez
- Emails trouves via l'API hunter.io a partir du site web de l'entreprise
- Connexion Gmail necessaire pour envoyer des emails
- Campagnes : envoi differe, suivi, relances automatiques apres X jours
- Score CV ATS : uploader CV + fiche de poste, obtenir un score de compatibilite

**Plans et credits**
- Gratuit : 5 envois/mois, recherche auto departement
- Standard (14EUR/mois) : 100 envois/mois, recherche auto departement
- Premium (39EUR/mois) : 400 envois/mois, recherche IA, emails IA, lettres de motivation, offres d'emploi
- Tokens supplementaires : Pack 50 (5EUR), Pack 100 (9EUR)

**Conseils et bonnes pratiques**
- Personnaliser les emails pour chaque entreprise
- Commencer par 40 emails/jour max par campagne
- Activer les relances automatiques (10 jours par defaut)
- Connecter Gmail pour un meilleur delivrabilite
- Utiliser le Score CV pour optimiser son CV avant de postuler

**FAQ**
- "Comment trouver des emails ?" -> Onglet Recherche > sauvegarder des entreprises > Recherche de contact
- "Comment envoyer des emails ?" -> Connecter Gmail dans Parametres puis aller dans Campagnes
- "Pourquoi mes emails rebondissent ?" -> L'email de l'entreprise n'est peut-etre plus valide
- "C'est quoi les tokens ?" -> Credits supplementaires pour envoyer des emails au-dela du quota mensuel
- "Comment fonctionne le score ATS ?" -> Il analyse les mots-cles de la fiche de poste et verifie leur presence dans votre CV

Implementation : streaming SSE via Lovable AI gateway (`google/gemini-2.5-flash` pour rapidite et cout faible).

### 2. Widget ChatbotWidget

- Bouton flottant en bas a droite (comme l'actuel)
- Au clic : ouvre un panneau/sheet avec 2 onglets (Tabs)
  - **Assistant** : interface de chat avec messages, input, streaming en temps reel
  - **Ticket** : formulaire actuel (sujet + description)
- Messages rendus en markdown (react-markdown a installer)
- Historique des messages en memoire locale (pas de persistence DB)
- Limite de contexte : envoyer les 20 derniers messages max

### 3. UI du chat

- Panneau fixe en bas a droite, style moderne
- Messages utilisateur a droite, messages IA a gauche
- Indicateur de chargement pendant le streaming
- Input avec bouton envoi
- Responsive mobile : le panneau prend toute la largeur sur mobile

