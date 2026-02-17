

# Strategie candidature spontanee - Fonctionnalites MVP raisonnables

## Analyse critique de ta demande

### Ce qui est faisable pour un MVP (sans tracking d'ouverture ni scope Gmail sensible)

Tu as raison sur les contraintes :
- **Tracking ouverture** : necessite un pixel de tracking (1x1 image hebergee) insere dans l'email. C'est techniquement faisable MAIS Gmail bloque souvent les images externes par defaut, ce qui rend les stats peu fiables. De plus, ca donne un aspect "commercial/spam" aux candidatures spontanees, ce qui va a l'encontre de ta strategie. **A eviter pour un MVP.**
- **Tracking reponses automatique** : necessite `gmail.readonly` ou `gmail.modify` = audit CASA a 75k. **Exclu.**
- **Machine learning / IA collective** : interessant a long terme mais beaucoup trop tot. Il faut d'abord des milliers de data points avec du feedback utilisateur. **V2/V3.**

### Ce qui est raisonnable et a forte valeur ajoutee

1. **Systeme de variantes d'emails (A/B testing manuel)** : Permettre a l'utilisateur de tagger ses emails avec un "type" (Corporate/RH, Valeur ajoutee, Manager, Question) et de noter manuellement le resultat (reponse positive, negative, aucune reponse). Pas besoin de ML, juste des statistiques simples.

2. **Personnalisation profonde des prompts IA** : Integrer ta synthese de strategie directement dans les prompts de generation d'emails et de lettres de motivation. C'est la ou tu auras le plus d'impact immediat.

3. **Dashboard de performance par type** : Agregation simple des resultats par type d'objet/ton pour que l'utilisateur voie visuellement quel style fonctionne le mieux.

---

## Plan d'implementation

### 1. Migration BDD - Ajouter les metadonnees de variante aux emails

Ajouter des colonnes a `email_campaigns` pour categoriser chaque email envoye :

- `subject_type` (text) : 'corporate', 'value', 'manager', 'question' (correspond aux 4 types d'objets de ta synthese)
- `tone` (text) : 'formal', 'balanced', 'direct', 'soft' (les 4 tons de corps d'email)
- `user_feedback` (text) : 'positive', 'negative', 'no_response', null (feedback manuel de l'utilisateur)
- `feedback_notes` (text) : notes libres de l'utilisateur sur pourquoi ca a marche ou non

Ca permet de construire de la data sans aucun tracking automatique.

### 2. Refonte des prompts IA - Emails personnalises

Mettre a jour la Edge Function `generate-personalized-emails` pour :

- Integrer les **4 types d'objets** de ta synthese (Corporate/RH, Valeur ajoutee, Manager, Question)
- Respecter la **structure 4 lignes max** du corps
- Toujours mentionner CV + lettre de motivation en PJ
- Ne jamais mentionner le type de contrat
- Eviter tout vocabulaire de prospection commerciale
- Generer un **objet structure** : `[Type d'approche] -- Candidature spontanee -- [Nom Prenom]`
- Retourner aussi le `subject_type` et le `tone` utilises pour le tracking

Le prompt systeme sera completement reecrit selon ta synthese.

### 3. Refonte des prompts IA - Lettres de motivation

Mettre a jour la Edge Function `generate-cover-letter` pour :

- Respecter la **structure 3 paragraphes** :
  1. Presentation (statut, specialisation, competences, outils)
  2. Entreprise (ce qui attire, projet/valeur/positionnement)
  3. Apport (contribution concrete, appui/renfort, ouverture)
- Maximum 1 page (~350 mots)
- Personnaliser avec au moins 1 element reel de l'entreprise (scrape)
- Ton professionnel, pas familier
- Pas de type de contrat mentionne

### 4. Interface de selection du type d'approche

Dans `UnifiedEmailSender`, avant la generation IA, ajouter un selecteur :

- **Type d'objet** : Corporate/RH | Valeur ajoutee | Manager | Question
- **Ton du mail** : Formel | Equilibre | Direct | Question (adouci)
- Ces choix sont envoyes au prompt IA pour guider la generation
- Ils sont aussi stockes dans `email_campaigns` a l'envoi

### 5. Feedback utilisateur dans le suivi des campagnes

Dans `CampaignsHub`, pour chaque email envoye, ajouter :

- Un selecteur de feedback : "Reponse positive" | "Reponse negative" | "Pas de reponse" (avec des icones couleur : vert/rouge/gris)
- Un champ de notes optionnel
- Ces infos sont sauvegardees dans `email_campaigns`

### 6. Dashboard de performance par type

Dans l'onglet "Suivi" de `CampaignsHub`, ajouter une section stats :

- **Taux de feedback positif par type d'objet** (bar chart horizontal)
- **Taux de feedback positif par ton** (bar chart horizontal)
- **Nombre d'emails par type** (donut)
- **Tendance dans le temps** (line chart simple)

Tout base sur les feedbacks manuels des utilisateurs. Pas de tracking automatique.

---

## Details techniques

### Migration SQL

```sql
ALTER TABLE public.email_campaigns 
ADD COLUMN subject_type text DEFAULT null,
ADD COLUMN tone text DEFAULT null,
ADD COLUMN user_feedback text DEFAULT null,
ADD COLUMN feedback_notes text DEFAULT null;
```

### Fichiers modifies

- `supabase/functions/generate-personalized-emails/index.ts` : Refonte complete du prompt systeme avec la strategie de candidature spontanee, ajout du parametre `subjectType` et `tone`
- `supabase/functions/generate-cover-letter/index.ts` : Refonte du prompt pour respecter la structure 3 paragraphes
- `src/components/dashboard/UnifiedEmailSender.tsx` : Ajout selecteur type d'objet + ton avant generation, stockage des metadonnees a l'envoi
- `src/components/dashboard/CampaignsHub.tsx` : Ajout feedback utilisateur par email + dashboard stats par type
- `src/integrations/supabase/types.ts` : Mis a jour automatiquement apres migration

### Ce qui est volontairement exclu du MVP

- Tracking d'ouverture par pixel (peu fiable + aspect spam)
- Tracking automatique des reponses (necessite scope sensible Gmail)
- Machine learning collectif (pas assez de data)
- n8n ou automatisations externes (complexite disproportionnee)
- A/B testing automatique avec rotation (trop complexe pour un MVP)

### Ordre d'implementation

1. Migration BDD (nouvelles colonnes)
2. Refonte prompt emails (`generate-personalized-emails`)
3. Refonte prompt lettres de motivation (`generate-cover-letter`)
4. Interface selecteur type/ton dans `UnifiedEmailSender`
5. Feedback utilisateur dans `CampaignsHub`
6. Dashboard stats par type

