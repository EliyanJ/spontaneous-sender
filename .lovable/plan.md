
## Problème identifié

Le `AdminLayout` enveloppe toutes les pages admin dans :
```html
<main className="container mx-auto px-4 py-6 flex-1">
  <Outlet />  ← AdminCVTemplateBuilder est ici
</main>
```

Cela crée 3 problèmes :
1. **`container mx-auto`** → limite la largeur max et centre avec des marges latérales → les onglets de droite sont coupés
2. **`px-4 py-6`** → padding qui réduit l'espace disponible
3. **Le layout parent est `min-h-screen flex flex-col`** sans overflow hidden → le `h-screen` du builder dépasse et crée des scroll/coupures

Le builder utilise `h-screen flex flex-col overflow-hidden` mais est contraint par ces classes parentes.

## Solution

**2 modifications seulement :**

### 1. `AdminLayout.tsx` — Permettre aux pages "plein écran" de bypasser le container

Ajouter une détection de la route active pour appliquer `p-0 max-w-none overflow-hidden` quand on est sur `/admin/cv-templates/:id`. Cela passe le contenu du builder en plein écran sans affecter les autres pages admin.

```tsx
// AdminLayout.tsx
import { useMatch } from "react-router-dom";

const isTemplateBuilder = useMatch("/admin/cv-templates/:id");

<main className={cn(
  "flex-1",
  isTemplateBuilder 
    ? "overflow-hidden flex flex-col"           // plein écran pour le builder
    : "container mx-auto px-4 py-6"             // normal pour les autres pages
)}>
  <Outlet />
</main>
```

Et l'élément racine passe de `min-h-screen flex flex-col` à `h-screen flex flex-col overflow-hidden` quand on est sur la route builder.

### 2. `AdminCVTemplateBuilder.tsx` — Ajuster le scale de la preview

Le scale actuel `0.72` avec `marginBottom: "-250px"` est approximatif et crée un débordement visuel. 

Le panneau droit a une largeur variable (flex-1 dans ~620px restants après le panneau gauche de 480px). Le CV A4 fait 794px de large. À 72% il fait 572px, ce qui dépasse le container.

Changer le scale à `0.65` (794 × 0.65 = 516px) avec `transformOrigin: "top center"` et utiliser `overflow: hidden` sur le container parent de la preview pour que ça reste dans les bounds.

La TabsContent "preview" doit avoir `overflow: hidden` au lieu de `overflow-auto` pour que le scaling fonctionne correctement, et le container de scale doit avoir une hauteur calculée.

```tsx
// Preview tab — layout correct
<TabsContent value="preview" className="flex-1 m-0 overflow-hidden">
  <div className="w-full h-full overflow-auto flex items-start justify-center p-4">
    <div style={{ 
      transform: "scale(0.65)", 
      transformOrigin: "top center",
      width: "210mm",
      height: "297mm",
      flexShrink: 0
    }}>
      <HTMLCVRenderer templateHtml={htmlContent} cvData={mockData} scale={1} />
    </div>
  </div>
</TabsContent>
```

## Fichiers à modifier

| Fichier | Changement |
|---|---|
| `src/pages/Admin/AdminLayout.tsx` | Détecter la route template builder → supprimer container/padding sur le `<main>` |
| `src/pages/Admin/AdminCVTemplateBuilder.tsx` | Corriger le scale et l'overflow de la preview tab |
