

# Plan : CMS Admin, Gestion de contenu et SEO

## Objectif

Ajouter trois grandes fonctionnalites au backoffice admin :

1. **Gestion avancee des comptes utilisateurs** : pouvoir reset les donnees specifiques (login, Gmail, envois) directement depuis la fiche utilisateur
2. **CMS / Editeur de contenu** : creer et editer des pages (articles de blog, pages custom) avec un editeur riche (texte, couleurs, liens, ancres, blocs HTML/CSS)
3. **Gestion SEO / Marketing** : modifier les balises meta (titre, description, OG tags) de chaque page depuis le backoffice

---

## 1. Reset des processus utilisateur (amelioration existante)

La fonctionnalite de suppression et reset existe deja dans `AdminUserDetail.tsx` avec les types `gmail`, `companies`, `subscription`. On va l'enrichir :

- Ajouter des types de reset supplementaires : `login` (reset mot de passe via lien), `emails_sent` (vider les email_campaigns), `all_data` (reset complet sans supprimer le compte)
- Mettre a jour la edge function `admin-reset-user-data` pour gerer ces nouveaux types
- Ameliorer l'UI avec des checkboxes pour choisir precisement quoi reset

---

## 2. CMS - Editeur de contenu

### Base de donnees

Creer une table `cms_pages` :

```text
cms_pages
- id (uuid, PK)
- slug (text, unique) -- URL de la page ex: /blog/mon-article
- title (text) -- Titre de la page
- content (text) -- Contenu HTML de la page
- meta_title (text) -- Balise title SEO
- meta_description (text) -- Meta description
- og_image (text) -- Image Open Graph
- status (text) -- draft / published
- author_id (uuid) -- FK vers auth.users
- published_at (timestamptz)
- created_at (timestamptz)
- updated_at (timestamptz)
```

RLS : Lecture publique pour les pages publiees, ecriture reservee aux admins.

### Editeur de texte riche

- Creer un composant `AdminCMS.tsx` (page principale avec liste des pages)
- Creer un composant `AdminPageEditor.tsx` avec :
  - Champ titre et slug
  - Editeur de texte riche (barre d'outils : gras, italique, titres, liens, couleurs, ancres)
  - Mode HTML brut pour editer le code directement
  - Preview en temps reel
  - Champs SEO (meta title, meta description, OG image)
  - Boutons Brouillon / Publier

L'editeur sera construit avec `contentEditable` et `document.execCommand` pour rester simple sans dependance externe lourde, avec un toggle vers un mode code HTML.

### Routes

- `/admin/cms` -- Liste des pages
- `/admin/cms/new` -- Creer une page
- `/admin/cms/:pageId` -- Editer une page
- `/blog/:slug` -- Page publique pour afficher le contenu

### Navigation

Ajouter un onglet "CMS" dans le menu admin (`AdminLayout.tsx`).

---

## 3. Gestion SEO / Meta tags

### Base de donnees

Creer une table `seo_settings` :

```text
seo_settings
- id (uuid, PK)
- page_path (text, unique) -- ex: "/", "/pricing", "/login"
- meta_title (text)
- meta_description (text)
- og_title (text)
- og_description (text)
- og_image (text)
- canonical_url (text)
- updated_at (timestamptz)
- updated_by (uuid)
```

RLS : Lecture publique, ecriture admin uniquement.

### Composant Admin

- Creer `AdminSEO.tsx` avec :
  - Liste des pages existantes du site (Landing, Pricing, Login, etc.)
  - Formulaire d'edition pour chaque page : meta title, meta description, OG title, OG description, OG image, canonical
  - Preview Google (apercu du rendu dans les resultats de recherche)

### Integration cote front

- Creer un hook `useSEO(pagePath)` qui charge les meta tags depuis `seo_settings`
- Utiliser `document.title` et des manipulations du DOM `<head>` pour injecter dynamiquement les balises meta
- Integrer le hook dans les pages principales (Landing, Pricing, etc.)

### Route

- `/admin/seo` -- accessible depuis un nouvel onglet "SEO" dans le menu admin

---

## Resume des fichiers a creer/modifier

### Nouveaux fichiers
- `src/pages/Admin/AdminCMS.tsx` -- Liste des pages CMS
- `src/pages/Admin/AdminPageEditor.tsx` -- Editeur de page riche
- `src/pages/Admin/AdminSEO.tsx` -- Gestion des meta tags SEO
- `src/pages/BlogPost.tsx` -- Page publique pour afficher un article
- `src/hooks/useSEO.ts` -- Hook pour charger et appliquer les meta tags

### Fichiers modifies
- `src/pages/Admin/AdminLayout.tsx` -- Ajout onglets CMS et SEO
- `src/pages/Admin/index.ts` -- Export des nouveaux composants
- `src/App.tsx` -- Nouvelles routes /admin/cms, /admin/seo, /blog/:slug
- `supabase/functions/admin-reset-user-data/index.ts` -- Nouveaux types de reset

### Migrations base de donnees
- Creation table `cms_pages` avec RLS
- Creation table `seo_settings` avec RLS

---

## Details techniques

- L'editeur riche utilisera `contentEditable` avec une barre d'outils personnalisee (pas de dependance externe type TipTap ou Quill) pour garder le bundle leger
- Le contenu HTML sera stocke tel quel dans la base et rendu avec `dangerouslySetInnerHTML` cote public, mais uniquement pour du contenu redige par les admins (contenu de confiance)
- Les meta tags SEO seront injectes dynamiquement via manipulation du DOM dans un `useEffect`
- Toutes les tables auront des politiques RLS strictes : lecture publique, ecriture admin uniquement via `has_role()`

