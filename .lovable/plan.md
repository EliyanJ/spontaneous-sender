
## Ce que l'utilisateur veut

Les "sitelinks" (liens sous le résultat principal sur Google) comme Jobscan les a. Ce n'est **pas** quelque chose qu'on peut forcer à 100% — Google décide seul de les afficher — mais on peut **fortement les encourager** en :

1. Ajoutant du **JSON-LD Schema.org** (`WebSite` + `SiteNavigationElement`) dans `index.html`
2. Mettant à jour le **sitemap** avec des descriptions claires pour chaque page clé
3. S'assurant que le **titre de la page** (balise `<title>`) contient bien le nom de marque

---

## Plan d'implémentation

### 1. JSON-LD `WebSite` + `SiteNavigationElement` dans `index.html`

Ajouter un script `<script type="application/ld+json">` avec :

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "name": "Cronos",
      "url": "https://spontaneous-sender.lovable.app/",
      "description": "...",
      "potentialAction": {
        "@type": "SearchAction",
        "target": "https://spontaneous-sender.lovable.app/?q={search_term_string}",
        "query-input": "required name=search_term_string"
      }
    },
    {
      "@type": "SiteLinksSearchBox",
      ...
    },
    {
      "@type": "ItemList",
      "name": "Pages principales",
      "itemListElement": [
        { "@type": "SiteNavigationElement", "position": 1, "name": "Score CV", "url": ".../score-cv" },
        { "@type": "SiteNavigationElement", "position": 2, "name": "Créer un CV", "url": ".../cv-builder" },
        { "@type": "SiteNavigationElement", "position": 3, "name": "Offres d'emploi", "url": ".../offres-emploi" },
        { "@type": "SiteNavigationElement", "position": 4, "name": "Tarifs", "url": ".../pricing" },
        { "@type": "SiteNavigationElement", "position": 5, "name": "Connexion", "url": ".../login" },
        { "@type": "SiteNavigationElement", "position": 6, "name": "Aide", "url": ".../help" }
      ]
    }
  ]
}
```

### 2. Corriger le `<title>` de la page

Passer de `<title>Cronos</title>` à `<title>Cronos — Recherche d'emploi 2.0 | Candidatures automatisées par IA</title>` pour que Google comprenne mieux la marque.

### 3. Mettre à jour le sitemap

Ajouter les pages manquantes (`/offres-emploi`, `/blog`) avec les bonnes priorités.

### Fichiers modifiés
- `index.html` — JSON-LD + title
- `public/sitemap.xml` — pages manquantes

### Note importante
Google décide **lui-même** d'afficher les sitelinks (généralement après quelques semaines/mois d'indexation). Le JSON-LD est le signal le plus fort qu'on puisse envoyer. Une fois en production sur un vrai domaine (pas `.lovable.app`), les chances sont bien meilleures.
