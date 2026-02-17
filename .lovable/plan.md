
# Correction : permettre la generation IA pour les emails manuels

## Probleme

Ligne 792 du fichier `UnifiedEmailSender.tsx` :

```text
const isPrepareDisabled = isGenerating || !gmailConnected || (isAiMode ? selectedCount === 0 : prepareCount === 0);
```

Quand le mode IA est actif (`isAiMode = true`), le bouton est desactive si `selectedCount === 0`, c'est-a-dire si aucune entreprise issue de la recherche n'est selectionnee. Les emails manuels (`manualCount`) ne sont pas pris en compte. Meme chose pour le texte du bouton (ligne 1219) qui affiche uniquement `selectedCount`.

## Solution

Modifier la condition de desactivation et le texte du bouton pour inclure les destinataires manuels dans le decompte, y compris en mode IA.

### Detail technique

**Fichier** : `src/components/dashboard/UnifiedEmailSender.tsx`

1. **Ligne 790** - Nouveau compteur total pour le mode IA :
   - Creer `totalGenerateCount = selectedCount + manualCount` (ou reutiliser `prepareCount` qui vaut deja ca)

2. **Ligne 792** - Condition du bouton :
   - Remplacer `isAiMode ? selectedCount === 0` par `isAiMode ? prepareCount === 0`
   - Ainsi, avoir des emails manuels suffit a debloquer le bouton meme sans entreprise

3. **Ligne 1219** - Texte du bouton :
   - Remplacer le texte pour afficher le total (entreprises + manuels) :
   - Si `selectedCount > 0 && manualCount > 0` : "Generer pour X entreprise(s) + Y email(s)"
   - Si `selectedCount > 0` uniquement : "Generer pour X entreprise(s)"
   - Si `manualCount > 0` uniquement : "Generer pour Y email(s) manuel(s)"

Ces 2 modifications (condition + texte) suffisent a debloquer la generation IA quand seuls des emails manuels sont presents.
