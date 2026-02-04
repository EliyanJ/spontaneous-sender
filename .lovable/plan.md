

# Plan : Aligner les scopes Gmail avec Google Cloud Console

## Problème identifié

Le fichier `src/pages/ConnectGmail.tsx` (ligne 97) demande actuellement **3 scopes Gmail** :
- `gmail.send` (Sensible - autorisé)
- `gmail.readonly` (Restreint - NON autorisé dans ta console)
- `gmail.modify` (Restreint - NON autorisé dans ta console)

Ta console Google Cloud n'a que `gmail.send`, d'où le rejet de Google.

## Modification à effectuer

**Fichier** : `src/pages/ConnectGmail.tsx`

**Ligne 97** - Avant :
```typescript
scopes: 'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.modify',
```

**Après** :
```typescript
scopes: 'https://www.googleapis.com/auth/gmail.send',
```

## Impact fonctionnel

| Fonctionnalité | Avant | Après |
|----------------|-------|-------|
| Envoyer des emails | Oui | Oui |
| Lire les emails reçus | Oui | Non |
| Marquer emails comme lus | Oui | Non |
| Détecter les réponses | Oui | Non |

## Avantages de ce changement

- Conformité avec Google Cloud Console
- Évite l'audit de sécurité CASA (3 000 € - 75 000 €)
- Vérification OAuth plus rapide (4-6 semaines)
- Moins de permissions = plus de confiance utilisateur

## Après la modification

Une fois le code déployé, réponds à Google avec ce message :

> "We have corrected the scope mismatch. Our application now only requests the gmail.send scope, which matches our OAuth consent screen configuration in Cloud Console. The code has been updated and deployed. Please proceed with the verification."

