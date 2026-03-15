
## Problème identifié

La capture d'écran montre des **chevauchements de texte** dans la zone "Convention de balisage" du panneau gauche. Ces annotations (`data-field="id"`, `data-section="id"`, etc.) se superposent par-dessus le `<textarea>` d'édition de code HTML.

### Cause

La `<details>` "Convention de balisage" est positionnée **après** le `<textarea>` dans le même conteneur `flex-col`. Mais le conteneur du panneau gauche utilise `overflow-y: auto` et le `<textarea>` a `min-height: 400px`.

Quand le panneau est trop petit en hauteur (viewport 638px + la toolbar), la convention "déborde" visuellement et ses éléments se chevauchent avec le textarea car :
1. Le conteneur `flex-1 flex flex-col` sur la zone de l'éditeur n'a pas de `min-h-0` correct
2. Le `<textarea>` avec `flex-1` et `min-h-[400px]` force le conteneur à dépasser la hauteur dispo
3. La `<details>` flottant juste en dessous se retrouve "sous" le textarea visuellement avec le overflow

### Solution

**`src/pages/Admin/AdminCVTemplateBuilder.tsx`** — deux corrections :

1. **Conteneur panneau gauche** : ajouter `min-h-0` pour que le flex fonctionne correctement dans un contexte `h-screen`
   ```tsx
   // AVANT
   <div className="flex flex-col border-r border-border bg-card overflow-y-auto"
     style={{ width: showPreview ? "480px" : "100%" }}
   >
   
   // APRÈS — overflow-y: auto déjà présent, mais ajouter min-h-0
   <div className="flex flex-col border-r border-border bg-card overflow-y-auto min-h-0"
     style={{ width: showPreview ? "480px" : "100%" }}
   >
   ```

2. **Zone éditeur** : retirer `min-h-[400px]` du textarea et remplacer par une hauteur minimale raisonnable (`min-h-[200px]`), et s'assurer que la zone flex-1 a `overflow-hidden`
   ```tsx
   // AVANT
   <div className="flex-1 flex flex-col p-4 gap-2 min-h-0">
   ...
   <textarea ... className="flex-1 min-h-[400px] ... />
   
   // APRÈS
   <div className="flex-1 flex flex-col p-4 gap-2 min-h-0 overflow-hidden">
   ...
   <textarea ... className="flex-1 min-h-[200px] ... />
   ```

### Résumé

```text
Fichier                          Changement
─────────────────────────────    ─────────────────────────────────────────
AdminCVTemplateBuilder.tsx       Panneau gauche : min-h-0 sur conteneur
                                 Zone éditeur   : overflow-hidden + min-h-[200px]
                                 → Élimine le débordement qui cause le chevauchement
```

Un seul fichier, deux petites modifications CSS de flexbox. La convention de balisage restera toujours visible en bas du scroll sans jamais chevaucher le textarea.
