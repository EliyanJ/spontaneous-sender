

# Plan : Supprimer les fonctionnalités qui requièrent gmail.readonly

## Problème identifié

Google a détecté que ton application fait des appels API Gmail qui nécessitent des scopes non autorisés :

| Edge Function | Appel API | Scope requis |
|--------------|-----------|--------------|
| `check-email-responses` | `GET /gmail/v1/users/me/messages` | `gmail.readonly` |
| `check-email-bounces` | `GET /gmail/v1/users/me/messages` | `gmail.readonly` |
| `sync-gmail-history` | `GET /gmail/v1/users/me/messages` | `gmail.readonly` |

## Solution proposée

Désactiver ces 3 edge functions en les remplaçant par des versions "stub" qui retournent immédiatement sans faire d'appels Gmail. Cela permet de :
- Garder les fichiers (pour les réactiver plus tard si tu obtiens les scopes)
- Ne plus faire d'appels API non autorisés
- Passer la vérification Google

## Modifications à effectuer

### 1. `supabase/functions/check-email-responses/index.ts`

Remplacer par une version qui retourne "Feature disabled" :

```text
serve(async (req) => {
  // Feature disabled - requires gmail.readonly scope
  return new Response(
    JSON.stringify({ 
      success: true, 
      message: 'Feature disabled - gmail.readonly scope not available',
      checked: 0,
      responsesFound: 0
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
```

### 2. `supabase/functions/check-email-bounces/index.ts`

Même approche - retourner immédiatement sans appel Gmail.

### 3. `supabase/functions/sync-gmail-history/index.ts`

Même approche - retourner immédiatement sans appel Gmail.

## Fonctionnalités impactées

| Fonctionnalité | Avant | Après |
|----------------|-------|-------|
| Envoi d'emails | Fonctionne | Fonctionne (gmail.send OK) |
| Détection auto des réponses | Fonctionne | Désactivé |
| Détection auto des bounces | Fonctionne | Désactivé |
| Sync historique Gmail | Fonctionne | Désactivé |

## Alternative future

Si tu veux réactiver ces fonctionnalités plus tard :
1. Ajouter `gmail.readonly` à ta console Google Cloud
2. Passer l'audit CASA (3 000 € - 75 000 €)
3. Réactiver le code dans les edge functions

## Réponse à Google après correction

Une fois le code déployé :

> "We have corrected the issue. Our application no longer makes any API calls requiring the gmail.readonly or gmail.modify scopes. The only Gmail API endpoint our app calls is `/gmail/v1/users/me/messages/send` which only requires the gmail.send scope. The edge functions that previously read emails have been disabled. Please proceed with the verification."

