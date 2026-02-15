
# Plan : CMS ameliore + Blog avec direction artistique Cronos

## Problemes identifies

1. **L'editeur CMS actuel** est un simple editeur texte avec une mini-preview dans une sidebar -- pas de preview live au centre style Webflow/Shopify
2. **La page blog** (`BlogPost.tsx`) est toute blanche sans header Cronos, sans navigation, sans footer
3. **Le slug est prefixe /blog/** meme pour des pages qui ne sont pas des articles
4. **Pas de distinction** entre "article de blog" et "page custom" dans le CMS

## Changements prevus

### 1. Refonte de l'editeur CMS (`AdminPageEditor.tsx`)

Nouveau layout style Webflow : **preview live au centre** avec panneaux de configuration sur les cotes.

Structure en 3 colonnes :
- **Gauche** : barre d'outils d'edition (formatage, couleurs, liens, ancres, images) -- verticale et compacte
- **Centre** : iframe/preview live qui montre le rendu exact de la page avec le header et footer Cronos appliques. L'edition se fait directement dans cette preview (contentEditable dans un cadre qui simule le rendu final)
- **Droite** : panneau de proprietes (titre, slug, type de page, SEO, statut)

Ajout d'un champ **type de page** :
- `blog` : article de blog, accessible sur `/blog/slug`
- `page` : page custom, accessible sur `/p/slug`

Le slug sera prefixe automatiquement selon le type choisi.

### 2. Ajout d'une colonne `page_type` a la table `cms_pages`

Migration SQL pour ajouter :
```text
ALTER TABLE cms_pages ADD COLUMN page_type text NOT NULL DEFAULT 'blog';
```

Valeurs possibles : `blog`, `page`

### 3. Refonte de la page blog publique (`BlogPost.tsx`)

Integrer la direction artistique Cronos :
- **Header** : logo Cronos + navigation (Accueil, Aide, Connexion) avec le meme style que Landing.tsx
- **Background** : gradients subtils comme sur la landing (primary/5, primary/10 blur)
- **Footer** : identique a celui de Landing.tsx (logo, liens legaux, copyright)
- **Contenu** : centre dans un container max-w-3xl avec typographie prose coherente
- **Theme** : support dark/light mode natif

### 4. Route pour les pages custom

Ajouter une route `/p/:slug` dans `App.tsx` qui utilise le meme composant `BlogPost` (ou un nouveau `DynamicPage.tsx`) mais sans l'affichage "article" (date, etc.)

### 5. Verification des chemins d'acces

- Articles de blog : `getcronos.fr/blog/mon-article`
- Pages custom : `getcronos.fr/p/ma-page`
- L'apercu Google dans l'editeur refletera le bon prefixe selon le type

---

## Details techniques

### Fichiers modifies

- **`src/pages/Admin/AdminPageEditor.tsx`** : Refonte complete du layout. Preview live au centre dans un conteneur qui reproduit le header/footer Cronos. Barre d'outils verticale a gauche. Panneau proprietes (titre, slug, type, SEO) a droite. Le contentEditable est place dans un cadre qui simule la page finale (avec le background gradient, le header et le footer visibles en preview).

- **`src/pages/BlogPost.tsx`** : Ajout du header Cronos (logo + nav avec liens Accueil, Aide, Tarifs, Connexion), du background gradient, et du footer identique a Landing.tsx. Distinction entre type `blog` (affiche date, titre article) et type `page` (affiche juste le contenu).

- **`src/pages/Admin/AdminCMS.tsx`** : Ajout d'un badge indiquant le type (Blog / Page) a cote du statut. Ajout de filtres par type.

- **`src/App.tsx`** : Ajout de la route `/p/:slug` pointant vers le meme composant BlogPost avec un prop pour differencier.

### Migration base de donnees

Ajout de la colonne `page_type` sur `cms_pages` avec valeur par defaut `'blog'` pour ne pas casser les pages existantes.

### Points cles UX

- La preview centrale montre le rendu reel avec header + footer + gradients -- on voit exactement ce que le visiteur verra
- L'edition se fait directement dans la preview (contentEditable) -- pas besoin d'aller dans un onglet separe
- La barre d'outils de formatage est toujours visible sur le cote gauche
- Les proprietes SEO et parametres de publication sont accessibles dans le panneau droit
- Le tout est responsive : sur mobile la preview prend toute la largeur et les panneaux passent en dessous
