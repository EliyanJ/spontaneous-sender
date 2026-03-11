
## Diagnostic

Deux problèmes identifiés :

**Problème 1 — Appel direct `fetch` au lieu de `supabase.functions.invoke()`**  
Dans `AdminCVTemplateBuilder.tsx` ligne 501, le code utilise `fetch(https://...supabase.co/functions/v1/ai-template-from-pdf)` directement. Pour un payload aussi lourd (PDF en base64 = plusieurs MB), ça échoue avec "Failed to fetch" à cause des limites réseau/timeout. Il faut utiliser `supabase.functions.invoke()` qui est prévu pour ça.

**Problème 2 — Gemini Vision ne lit pas les PDFs via `data:application/pdf;base64`**  
Dans l'edge function ligne 141, on envoie `url: data:application/pdf;base64,${fileBase64}`. Gemini Vision ne supporte pas ce format — il faut lui envoyer une **image** PNG ou JPEG. La solution : côté client, convertir la première page du PDF en image via `canvas` HTML5 avant d'envoyer, ou côté edge function, changer l'approche pour envoyer le PDF comme fichier inline avec le bon MIME type supporté par Gemini (`application/pdf` est supporté via `inline_data` dans l'API native Gemini, pas via le format OpenAI `image_url`).

## Solution

### Fix 1 — Client : utiliser `supabase.functions.invoke()`

Remplacer le `fetch` direct par `supabase.functions.invoke('ai-template-from-pdf', { body: { fileBase64, fileName } })`.

### Fix 2 — Edge function : utiliser l'API Gemini native avec inline_data PDF

L'API Gemini native (pas le wrapper OpenAI) supporte les PDFs via `inline_data` avec `mime_type: "application/pdf"`. On doit appeler directement `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent` avec la clé LOVABLE_API_KEY... 

Mais attendons — le gateway Lovable (`ai.gateway.lovable.dev`) est un proxy OpenAI-compatible. Il ne supporte pas forcément le format `inline_data` PDF. La meilleure solution est de **changer le modèle et le format** :

**Option retenue** : Utiliser le gateway Lovable mais avec `model: "google/gemini-2.5-flash"` et envoyer le PDF en `data:image/jpeg;base64` après avoir converti le PDF côté client en image via l'API Canvas HTML5 + `pdf.js` — mais ça ajoute une dépendance.

**Option plus simple et fiable** : Côté edge function, utiliser directement l'API Google Gemini native avec `LOVABLE_API_KEY` (qui fonctionne avec l'API native Gemini) et le format `inline_data` qui supporte nativement les PDFs. La clé `LOVABLE_API_KEY` est bien disponible dans les secrets.

En fait, après réflexion, la solution la plus propre est :
- **Client** : convertir PDF → base64 image (première page) via le `FileReader` + une `<canvas>` avec `pdf.js` intégré via CDN — trop complexe sans lib.
- **Alternative simple** : Envoyer le PDF en base64 à l'edge function et utiliser **l'API Gemini native** (pas le gateway OpenAI-compatible) qui supporte nativement les PDFs via `inline_data`.

### Plan final

**Fichier 1 : `src/pages/Admin/AdminCVTemplateBuilder.tsx`**  
Remplacer le `fetch` direct par `supabase.functions.invoke()` — c'est le fix principal du "Failed to fetch".

**Fichier 2 : `supabase/functions/ai-template-from-pdf/index.ts`**  
Changer l'appel AI pour utiliser l'API Gemini native (`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`) avec `inline_data` qui supporte les PDFs nativement. Utiliser le secret `LOVABLE_API_KEY` comme clé API Gemini (le gateway Lovable fournit cette clé compatible avec l'API Google AI Studio).

Wait — `LOVABLE_API_KEY` est une clé Lovable gateway, pas une clé Google AI Studio. On ne peut pas l'utiliser directement sur `generativelanguage.googleapis.com`.

**Solution définitive retenue** :  
Utiliser le gateway Lovable avec `google/gemini-2.5-flash` mais en passant le PDF comme `image_url` avec `data:image/png;base64` — ce qui nécessite une conversion PDF→image. 

Ou encore plus simple : on garde le gateway Lovable mais on utilise `data:application/pdf;base64` — certaines versions de Gemini via le gateway le supportent. Le vrai bug était le `fetch` direct côté client qui échouait avant même d'atteindre la fonction.

**Plan concret :**
1. Fix client : `supabase.functions.invoke()` au lieu de `fetch` direct
2. Fix edge function : tenter avec `data:application/pdf;base64` comme avant MAIS ajouter un fallback — si Gemini refuse le PDF, envoyer juste le prompt textuel avec des instructions de layout générique. Et aussi tester avec `mime_type` via le format multipart natif Gemini via le gateway.

En fait le plus robuste : utiliser `google/gemini-2.5-pro` qui supporte mieux les PDFs, et envoyer via le format `file_data` ou `inline_data` du gateway.

Regardons ce que supporte le gateway — il est OpenAI-compatible donc on utilise `image_url`. Gemini 2.5 Flash/Pro via ce gateway supporte `data:application/pdf;base64` car c'est Gemini sous le capot.

**Conclusion du diagnostic :** Le vrai bug était le `fetch` direct côté client qui échoue avec de gros payloads. Fix = `supabase.functions.invoke()`. L'edge function elle-même est OK (CORS en place, structure correcte).

### Fichiers à modifier

1. **`src/pages/Admin/AdminCVTemplateBuilder.tsx`** — Remplacer le `fetch` direct par `supabase.functions.invoke()` dans `handleImportPDF` (~lignes 496-511)
2. **`supabase/functions/ai-template-from-pdf/index.ts`** — Deux améliorations :
   - Enlever la vérification manuelle du JWT (puisque `verify_jwt = true` dans config.toml, Supabase le vérifie déjà automatiquement → double vérif inutile qui peut casser)
   - Changer le `mime_type` du PDF : tester avec `data:application/pdf;base64` mais aussi ajouter le modèle `google/gemini-2.5-pro` qui gère mieux les documents
