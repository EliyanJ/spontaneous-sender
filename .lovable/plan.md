

# Refonte du CMS Cronos - Editeur plein ecran, blocs reutilisables et mediatheque

## Contexte

L'editeur CMS actuel est imbrique dans le layout admin (avec la barre de navigation Dashboard/Users/Data...), ce qui reduit l'espace de previsualisation. Les insertions d'images et de couleurs se font via des `prompt()` natifs du navigateur, peu ergonomiques. Il n'existe pas de systeme de blocs reutilisables.

---

## 1. Editeur plein ecran (sans le menu admin)

**Probleme** : L'editeur est enfant de `AdminLayout` qui affiche la barre de navigation admin en permanence.

**Solution** : Sortir la route `/admin/cms/:pageId` du layout admin pour qu'elle ait sa propre page plein ecran, avec uniquement un bouton "Retour" vers `/admin/cms`.

- Modifier `App.tsx` : deplacer la route `cms/:pageId` hors du `<Route path="/admin" element={<AdminLayout />}>` tout en gardant la protection `AdminRoute`
- L'editeur occupera 100vh sans la barre admin
- Le bouton "Retour" existant redirige deja vers `/admin/cms`

---

## 2. Mediatheque avec stockage (images et videos)

**Probleme** : L'insertion d'images/videos demande de coller une URL manuellement via `prompt()`.

**Solution** : Creer un bucket de stockage `cms-media` et un composant `MediaLibrary` en popup (Dialog).

### Base de donnees
- Creer un bucket de stockage `cms-media` (public) pour heberger les fichiers
- Politique RLS : les admins peuvent upload/supprimer, tout le monde peut lire (les medias sont publics sur le site)

### Composant `MediaLibrary`
- Dialog modale qui s'ouvre au clic sur "Image" ou "Video" dans la toolbar
- Deux onglets : "Bibliotheque" (fichiers deja uploades) et "Importer"
- Onglet Bibliotheque : grille de vignettes avec recherche, clic pour selectionner
- Onglet Importer : zone de drag-and-drop ou bouton parcourir, formats acceptes (png, jpg, webp, gif, mp4, webm)
- A la selection, l'URL publique du fichier est inseree dans l'editeur via `execCommand`

### Fichiers
- Nouveau composant : `src/components/cms/MediaLibrary.tsx`
- Modification : `AdminPageEditor.tsx` - remplacer `insertImage()` et ajouter `insertVideo()` par l'ouverture de la mediatheque

---

## 3. Palette de couleurs visuelle

**Probleme** : Le changement de couleur demande de taper un code hex dans un `prompt()`.

**Solution** : Utiliser un `<input type="color">` natif HTML5 qui ouvre le selecteur systeme, combine avec des presets de couleurs de la charte Cronos.

### Composant `ColorPickerPopover`
- Popover qui s'ouvre au clic sur l'icone Palette
- En haut : grille de couleurs preselectionnees (noir, blanc, primary, secondary, rouge, bleu, vert, orange, violet...)
- En bas : input type="color" natif pour choisir une couleur personnalisee
- Au clic sur une couleur, applique `execCommand("foreColor", color)` immediatement

### Fichiers
- Nouveau composant : `src/components/cms/ColorPickerPopover.tsx`
- Modification : `AdminPageEditor.tsx` - remplacer `changeColor()` par le popover

---

## 4. Systeme de blocs reutilisables

**Probleme** : Pas de moyen de creer des blocs HTML/CSS reutilisables avec des parametres de style editables.

**Solution** : Creer une table `cms_blocks` pour stocker des blocs avec leur code source (HTML/CSS/JS) et des parametres de stylisation editables.

### Base de donnees

Nouvelle table `cms_blocks` :
- `id` (uuid, PK)
- `name` (text) - nom du bloc (ex: "Hero Banner", "Section CTA")
- `description` (text) - description courte
- `html_template` (text) - code HTML du bloc avec des placeholders pour les parametres editables (ex: `{{title}}`, `{{bg_color}}`)
- `css` (text) - styles CSS du bloc
- `js` (text, nullable) - JavaScript optionnel
- `thumbnail_url` (text, nullable) - apercu visuel
- `editable_params` (jsonb) - definition des parametres editables : nom, type (text, color, url, select), valeur par defaut
- `category` (text) - categorie (hero, section, cta, footer, card...)
- `created_at`, `updated_at` (timestamps)
- `created_by` (uuid) - admin qui a cree le bloc

RLS : admins peuvent tout faire, lecture publique pour le rendu.

### Interface d'insertion de blocs

Nouveau composant `BlockInserter` :
- Dialog accessible depuis la toolbar de l'editeur (nouveau bouton "Blocs")
- Affiche les blocs disponibles en grille avec apercu
- Filtre par categorie
- Au clic : insere le HTML du bloc dans l'editeur avec les valeurs par defaut des parametres

### Interface de creation de blocs

Nouvelle page `AdminBlockEditor` (route `/admin/cms/blocks/new` et `/admin/cms/blocks/:blockId`) :
- Editeur de code HTML/CSS/JS (textarea avec coloration ou simplement mode HTML)
- Formulaire pour definir les parametres editables (nom, type, valeur par defaut)
- Apercu en temps reel du bloc
- Le bloc est sauvegarde en base

### Edition des parametres d'un bloc insere

Quand un bloc est insere dans une page, les parametres simples (couleurs, textes, polices, liens) sont editables directement :
- Les textes sont editables via contentEditable (deja en place)
- Les couleurs de fond, polices, alignements sont modifiables via le panneau de droite quand un bloc est selectionne

Les elements structurels (nombre d'images, animations, layout) ne sont PAS modifiables depuis l'editeur de page -- il faut modifier le bloc source.

### Fichiers
- Nouveau composant : `src/components/cms/BlockInserter.tsx`
- Nouvelle page : `src/pages/Admin/AdminBlockEditor.tsx`
- Modification : `AdminCMS.tsx` - ajouter un onglet "Blocs" pour gerer les blocs
- Modification : `AdminPageEditor.tsx` - ajouter le bouton "Blocs" dans la toolbar
- Modification : `App.tsx` - ajouter les routes pour l'editeur de blocs

---

## 5. Performance du CMS sur le site principal

Concernant la question de la performance : le CMS n'alourdit pas le site car les composants admin ne sont charges (importes) que lorsqu'on navigue vers `/admin/*` grace au lazy loading de React Router. Les visiteurs normaux du site ne telechargeront jamais le code du CMS. On pourra ajouter `React.lazy()` sur les imports admin pour optimiser davantage le bundle splitting.

---

## Ordre d'implementation

1. Migration BDD : bucket `cms-media` + table `cms_blocks`
2. Sortir l'editeur du layout admin (route plein ecran)
3. Composant `MediaLibrary` avec upload et selection
4. Composant `ColorPickerPopover`
5. Table et CRUD pour `cms_blocks`
6. Composant `BlockInserter` + `AdminBlockEditor`
7. Integration de tout dans `AdminPageEditor`

---

## Details techniques

### Migration SQL

```sql
-- Bucket cms-media public
INSERT INTO storage.buckets (id, name, public) VALUES ('cms-media', 'cms-media', true);

-- Politique RLS storage : admins upload/delete, public read
CREATE POLICY "Public read cms-media" ON storage.objects FOR SELECT USING (bucket_id = 'cms-media');
CREATE POLICY "Admins can upload cms-media" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'cms-media' AND has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete cms-media" ON storage.objects FOR DELETE USING (bucket_id = 'cms-media' AND has_role(auth.uid(), 'admin'));

-- Table cms_blocks
CREATE TABLE public.cms_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  html_template TEXT NOT NULL DEFAULT '',
  css TEXT DEFAULT '',
  js TEXT,
  thumbnail_url TEXT,
  editable_params JSONB DEFAULT '[]',
  category TEXT DEFAULT 'general',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.cms_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage blocks" ON public.cms_blocks FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Public can read blocks" ON public.cms_blocks FOR SELECT USING (true);
```

### Nouveaux fichiers
- `src/components/cms/MediaLibrary.tsx` - Mediatheque avec upload/selection
- `src/components/cms/ColorPickerPopover.tsx` - Palette de couleurs visuelle
- `src/components/cms/BlockInserter.tsx` - Insertion de blocs dans l'editeur
- `src/pages/Admin/AdminBlockEditor.tsx` - Creation/edition de blocs

### Fichiers modifies
- `src/App.tsx` - Route editeur hors AdminLayout + routes blocs
- `src/pages/Admin/AdminPageEditor.tsx` - Integration mediatheque, palette, blocs, plein ecran
- `src/pages/Admin/AdminCMS.tsx` - Onglet blocs dans la liste

