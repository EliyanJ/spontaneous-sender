
## Modifications dans `src/components/HelpBubble.tsx`

3 changements précis sur le même fichier :

1. **Bouton déclencheur** (ligne 103–109) : Remplacer l'icône seule par un bouton avec texte "Reporter un problème"
2. **Masquer le bloc "Page actuelle"** côté utilisateur (lignes 160–162) : Le `div` avec `📍 Page actuelle:` reste dans le code et continue d'envoyer `current_page` en BDD, mais il devient `hidden` pour l'utilisateur final — visible uniquement en backoffice via l'admin
3. **Bouton submit** (ligne 173) : Remplacer "Envoyer le ticket" par "Envoyer"

### Détail des changements

```text
Ligne 103 → Bouton rond + texte "Reporter un problème"
  - Changer size="icon" → size="default"  
  - Ajouter className flex gap-2 pr-4
  - Ajouter <span>Reporter un problème</span> après l'icône
  - Ajuster w-12 h-12 → h-auto w-auto px-4 py-3

Ligne 160-162 → Ajouter className="hidden" sur le div page actuelle
  (le champ current_page reste envoyé en BDD, juste masqué visuellement)

Ligne 173 → "Envoyer le ticket" → "Envoyer"
```

**Fichier modifié :** `src/components/HelpBubble.tsx` uniquement
