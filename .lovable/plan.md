
## Ce qu'on fait

Créer un fichier Markdown `PRODUCT_OVERVIEW.md` à la racine du projet. Ce fichier sert de référence produit complète : pages, fonctionnalités, plans tarifaires, architecture backend — idéal pour itérer avec un collègue ou une IA conversationnelle.

## Contenu du fichier

### Structure

```text
PRODUCT_OVERVIEW.md
├── 1. Vue d'ensemble produit
├── 2. Pages publiques (landing, blog, offres, score-cv, cv-builder, pricing)
├── 3. Authentification & onboarding
├── 4. Dashboard utilisateur (onglets + fonctionnalités)
│   ├── Vue d'ensemble (KPIs, chart)
│   ├── Recherche d'entreprises (AI / manuelle / automatique)
│   ├── Mes entreprises (CRM léger)
│   ├── Emails & campagnes
│   ├── Score CV (comparateur ATS)
│   ├── Offres d'emploi
│   └── Paramètres
├── 5. Plans & feature gating
├── 6. Back-office admin (10 sections)
├── 7. Intégrations techniques (Gmail OAuth, Stripe, edge functions)
├── 8. Modèle de données (tables principales)
└── 9. Glossaire termes métier
```

### Ce que ça couvrira précisément

**Pages publiques**
- `/` Landing : hero, "comment ça marche", pricing, footer
- `/score-cv` : comparateur ATS gratuit (1 essai sans compte), FAQ SEO, popup auth
- `/cv-builder` : éditeur CV public (4+ templates), génération IA, export
- `/offres-emploi` : offres France Travail, filtre, pagination, favoris localStorage
- `/blog` : articles statiques conseils carrière
- `/pricing` : 3 plans (Gratuit / Standard 14€ / Premium 39€) + packs tokens

**Dashboard** — 8 onglets
1. Vue d'ensemble : KPIs (emails trouvés, CV générés, crédits), chart performance, table entreprises récentes, accès rapide
2. Recherche : 3 modes (IA → description langage naturel, Manuelle → filtres secteur/ville, Automatique → secteurs profil) → résultats → sauvegarde en CRM
3. Mes entreprises : CRM léger, statuts pipeline (contacté / optimisé / en attente), notes, lien site web, sheet détail
4. Emails : composition email (IA ou template), upload CV, sélection entreprises, envoi Gmail, planification, suivi réponses, relances automatiques
5. Campagnes : liste campagnes envoyées, stats (ouverts, réponses, catégories), feedback utilisateur thumbs up/down
6. Score CV : upload CV + coller fiche de poste → score /100 sur 7 critères (mots-clés primaires/secondaires, soft skills, structure, coordonnées, résultats mesurables, titre)
7. Offres d'emploi (redirect vers `/offres-emploi` public)
8. Paramètres : profil, abonnement, Gmail, préférences notifications, relances automatiques

**Admin** — 10 sections
- Dashboard : KPIs globaux (users, emails, recherches)
- Utilisateurs : liste, détail user, reset data, suppression
- Data Center : analytics (abonnements, candidatures, démographiques, engagement, tracking)
- Tickets support : liste + détail conversation
- Promos : codes promo Stripe
- ATS : entraînement des référentiels métier (professions, mots-clés par catégorie)
- Équipe : gestion des rôles admin
- CMS : éditeur de pages (blocs drag-and-drop, rich text, médias)
- SEO : meta title/desc/og:image par route, sitemap, robots.txt
- Chatbot : configuration de l'assistant IA

**Plans tarifaires**
| Plan | Prix | Envois/mois | Recherche | IA emails | LM | Offres d'emploi |
|---|---|---|---|---|---|---|
| Gratuit | 0€ | 5 | Auto (département) | ✗ | ✗ | ✗ |
| Standard | 14€/mois | 100 | Auto (département) | ✗ | ✗ | ✗ |
| Premium | 39€/mois | 400 | IA + Manuelle (ville) | ✓ | ✓ | ✓ |
| Pack 50 tokens | 5€ | — | — | — | — | — |
| Pack 100 tokens | 9€ | — | — | — | — | — |

**Modèle de données** — tables principales
- `profiles` : infos utilisateur, secteurs cibles, CV
- `subscriptions` : plan, sends_remaining, tokens_remaining
- `companies` : CRM (1 par user), statut pipeline
- `email_campaigns` : emails individuels envoyés
- `campaigns` : campagnes groupées
- `ats_professions` / `ats_keyword_feedback` : référentiel ATS entraînable
- `user_activity_logs` : tracking comportemental
- `job_queue` : file de travaux asynchrones
- `user_roles` : rôles admin séparés
- `user_generated_cvs` : CVs générés sauvegardés

**Intégrations**
- Gmail OAuth (connect-gmail → callback → store-gmail-tokens → envoi via send-gmail-emails)
- Stripe (checkout, customer portal, webhook abonnements)
- France Travail API (offres d'emploi)
- Lovable AI (génération emails, LM, CV, chatbot)
- Edge functions : ~25 fonctions déployées (search-companies, find-company-emails, generate-cover-letter, process-scheduled-emails, check-email-responses, etc.)

## Emplacement recommandé

`PRODUCT_OVERVIEW.md` à la racine — visible dans le repo GitHub, consultable directement dans n'importe quel éditeur ou IA.
