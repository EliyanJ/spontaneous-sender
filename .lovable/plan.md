
# Plan SEO — 4 chantiers majeurs

## Vue d'ensemble
Le message couvre 4 sujets distincts. Je vais les traiter dans l'ordre de priorité SEO/business :

---

## 1. Page publique `/score-cv` — Landing SEO + Comparateur CV gratuit

**Objectif** : Page publique (sans auth), accessible aux moteurs, avec le comparateur ATS intégré + tunnel d'inscription post-essai.

### Structure de la page
```
/score-cv  (route publique, pas de ProtectedRoute)
├── Hero section  →  H1 + CTA "Tester gratuitement"
├── Outil comparateur (CVComparator réutilisé tel quel)
├── Popup post-analyse  →  "Créez votre compte gratuit pour comparer à l'infini"
│     └── Formulaire email/password → création de compte Supabase
└── Section SEO bas de page
      ├── Texte riche avec mots-clés (H2, paragraphes, gras)
      └── Accordéons FAQ (ex: "Comment fonctionne l'ATS ?", "Pourquoi optimiser son CV ?")
```

### Logique d'accès
- L'outil fonctionne **1 fois sans compte**
- Après analyse → popup `AuthDialog` personnalisée avec message de valeur
- Compte créé → redirect `/dashboard?tab=cv`

### SEO technique sur cette page
- `useSEO("/score-cv")` → meta title/desc configurable depuis le BO
- Balise H1 unique, H2 dans les sections FAQ
- Texte ~800 mots minimum en bas de page (géré via CMS ou hardcodé)
- Canonical URL configurée
- Ajout de `/score-cv` dans `SITE_PAGES` de `AdminSEO.tsx`

---

## 2. Amélioration du CMS — Sélecteur de balise HTML + effets de texte

**Problème actuel** : `AdminPageEditor.tsx` a H1/H2/H3 dans la barre d'outils mais pas de sélecteur explicite de balise pour les blocs de texte. Pas d'effet "texte souligné coloré" type mise en avant.

### Ce qu'on ajoute
- **Sélecteur de balise** dans la toolbar : dropdown `<p>` / `<h1>` / `<h2>` / `<h3>` avec règle visuelle "1 seul H1 par page" (warning si H1 déjà présent)
- **Effet texte surligné** : bouton "Highlight" dans la toolbar → `<mark>` stylé avec couleur configurable (rose/jaune comme l'image fournie)
- Les couleurs de highlight configurables via `ColorPickerPopover` déjà existant

---

## 3. CV Builder — Nouveaux modèles + personnalisation design

**Actuel** : 4 templates (`classic`, `dark`, `light`, `geo`) avec couleurs configurables. Photo déjà supportée (`photoUrl` dans `CVDesignOptions`).

### Ajouts
- **2-3 nouveaux templates** inspirés des screenshots fournis :
  - `modern-two-col` : deux colonnes (sidebar colorée + contenu), avec photo ronde en haut
  - `minimal-line` : séparateurs de ligne épurés, typographie aérée
- **Sélecteur de template visuel** : grille de miniatures cliquables (comme le site concurrent montré)
- **Panneau design** : couleur de fond de section, couleur du texte, couleur d'accent — déjà partiellement présent, à enrichir
- **Upload photo** : interface d'upload vers Supabase Storage + affichage dans le template

---

## 4. SEO global — Optimisations techniques

- Ajout `/score-cv` dans `AdminSEO.tsx` SITE_PAGES
- `robots.txt` : vérifier que `/score-cv` est indexable (actuellement public/robots.txt)
- Sitemap XML statique : créer `public/sitemap.xml` avec les URLs principales
- Structure JSON-LD Schema.org sur `/score-cv` (SoftwareApplication)
- `useSEO` déjà en place sur Landing — à ajouter sur `/score-cv` et Pricing

---

## Fichiers à créer/modifier

| Fichier | Action |
|---|---|
| `src/pages/CVScorePage.tsx` | CRÉER — page publique SEO |
| `src/components/dashboard/CVComparator.tsx` | MODIFIER — prop `isPublic` pour désactiver auth check |
| `src/components/CVScoreAuthPopup.tsx` | CRÉER — popup post-analyse |
| `src/pages/Admin/AdminSEO.tsx` | MODIFIER — ajouter `/score-cv` |
| `src/pages/Admin/AdminPageEditor.tsx` | MODIFIER — sélecteur balise + highlight |
| `src/lib/cv-templates.ts` | MODIFIER — 2 nouveaux templates |
| `src/components/cv-builder/CVPreview.tsx` | MODIFIER — render nouveaux templates |
| `src/components/cv-builder/CVBuilderForm.tsx` | MODIFIER — sélecteur visuel templates |
| `src/App.tsx` | MODIFIER — route `/score-cv` publique |
| `public/sitemap.xml` | CRÉER |

---

## Ordre d'implémentation recommandé

1. Page `/score-cv` + popup auth (impact SEO + business immédiat)
2. SEO technique global (sitemap, schema.org)
3. CMS éditeur amélioré (balises H + highlight)
4. CV Builder nouveaux templates + sélecteur visuel
