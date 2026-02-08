

## Correction du bug "Invalid OAuth redirect URL"

### Probleme
Dans `src/lib/auth-utils.ts`, la validation de l'URL OAuth est trop restrictive. Quand `skipBrowserRedirect: true` est utilise, Supabase retourne sa propre URL d'autorisation (sur `supabase.co`), qui redirige ensuite vers Google. Le code actuel n'autorise que `accounts.google.com`, ce qui bloque l'URL Supabase legitime.

### Solution
Ajouter le domaine Supabase du projet (`fxnnnhmhshmhcttmucwf.supabase.co`) a la liste des hotes autorises dans la validation.

### Changement technique

**Fichier**: `src/lib/auth-utils.ts` (ligne 33)

Avant:
```typescript
const allowedHosts = ["accounts.google.com"];
```

Apres:
```typescript
const allowedHosts = [
  "accounts.google.com",
  "fxnnnhmhshmhcttmucwf.supabase.co",
];
```

Cela permet a l'URL d'autorisation Supabase de passer la validation, tout en maintenant la protection contre les redirections malveillantes.

