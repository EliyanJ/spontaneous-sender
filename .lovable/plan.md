
## Fonctionnalité : Import PDF → Reproduction IA du Design

### Ce que fait la feature

1. Bouton "Importer un PDF" dans la toolbar du builder
2. Upload d'un PDF → envoyé à une **nouvelle Edge Function** `ai-template-from-pdf`
3. L'IA (Gemini Vision) analyse visuellement le PDF et retourne un **JSON `CanvasConfig` canvas-v2** avec :
   - Les zones colorées (shapes) reproduisant le layout (sidebar, header, bandes)
   - Les blocs CV (cv-sections) positionnés aux bons endroits
   - Les textes libres (titres, labels) aux bonnes positions
   - Les styles (couleurs, polices, tailles) approximés depuis le PDF
4. Le canvas se peuple automatiquement avec ces éléments
5. L'admin peut ensuite ajuster/corriger chaque élément librement

### Flow utilisateur

```text
[Importer PDF] → sélection fichier → spinner "Analyse IA..." 
→ canvas peuplé avec la reproduction → message "XX éléments générés, ajustez le design"
```

### Architecture technique

**1. Nouvelle Edge Function : `supabase/functions/ai-template-from-pdf/index.ts`**

Reçoit `fileBase64` (PDF), appelle Gemini Vision avec un prompt structuré demandant un JSON canvas-v2. Utilise `tool_calling` pour forcer une sortie JSON stricte (CanvasConfig).

Prompt système :
- "Analyse ce CV PDF et génère un JSON de layout pour un éditeur de template"
- Décrit le schéma exact des éléments (shape, text, cv-section, divider)
- Canvas 595×842px
- Identifie : couleurs dominantes, layout (sidebar ?), zones de texte, sections CV

Retourne : `{ success: true, config: CanvasConfig }`

**2. Modifications `AdminCVTemplateBuilder.tsx`**

- Ajouter `isImporting` state (boolean)
- Ajouter un `<input type="file" accept=".pdf" ref={fileInputRef} />`
- Bouton "📄 Importer PDF" dans la toolbar → click ouvre le file input
- Handler `handleImportPDF` :
  - Lit le fichier → base64
  - Appelle `ai-template-from-pdf`
  - Si succès : `setConfig(result.config)` + toast "Template généré — ajustez les détails"
  - Si erreur : toast erreur

**3. Prompt IA détaillé pour guider la reconstruction**

```
Tu analyses un CV au format PDF. 
Génère un objet JSON CanvasConfig (canvas-v2) avec des éléments positionnés en px sur un canvas 595×842px.

Règles :
- Identifie si le CV a une sidebar (colonne gauche colorée) → crée une shape pleine
- Identifie les zones header → crée shapes/text
- Identifie les sections (expériences, compétences, contact, etc.) → crée des cv-section aux bons endroits
- Pour les titres, sous-titres et textes décoratifs → crée des éléments "text"
- Pour les lignes séparatrices → crée des "divider"
- Extrait les couleurs dominantes (fond, texte, accent)
- Positionne les éléments le plus fidèlement possible aux blocs visuels du PDF
```

**4. Ajout dans `supabase/config.toml`**

```toml
[functions.ai-template-from-pdf]
verify_jwt = true
```

### Fichiers à créer/modifier

| Fichier | Action |
|---|---|
| `supabase/functions/ai-template-from-pdf/index.ts` | Créer |
| `supabase/config.toml` | Ajouter entry |
| `src/pages/Admin/AdminCVTemplateBuilder.tsx` | Ajouter bouton + handler import |

### UI dans le builder

Dans la toolbar, entre "Ligne" et les actions de sélection :
```
[T Texte] [⬛ Forme pleine] [□ Forme vide] [─ Ligne] | [📄 Importer PDF IA] | [Annuler] [Sauvegarder]
```

Pendant l'analyse : le bouton affiche un spinner et le canvas affiche un overlay semi-transparent "Analyse IA en cours..."

Après génération : toast success + les éléments apparaissent sur le canvas, prêts à être modifiés.

### Gestion des limites

- PDF limité à 10MB côté client (validation avant upload)
- L'IA ne peut pas reproduire les images embarquées dans le PDF → les zones image sont approximées par des shapes colorées
- Les sections CV placées sont celles détectées (contact, expériences, etc.) — l'admin peut en ajouter d'autres depuis la palette gauche
- Si l'IA échoue (PDF corrompu, trop complexe) → toast d'erreur explicite, canvas inchangé
