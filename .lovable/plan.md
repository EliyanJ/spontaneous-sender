
# Ameliorations de la page de connexion

## 1. Message d'erreur inline (au lieu du toast)

**Probleme** : Quand la connexion echoue, le message "Invalid login credentials" apparait en toast en bas a droite, en anglais.

**Solution** : Ajouter un state `loginError` dans `Login.tsx` et `AuthDialog.tsx`. Quand `signInWithPassword` retourne une erreur, afficher un message traduit ("Adresse email ou mot de passe incorrect") directement sous les champs email/mot de passe, dans un encadre rouge visible.

### Fichiers modifies

- **`src/pages/Login.tsx`** :
  - Ajouter un state `loginError: string | null`
  - Dans `handleEmailLogin`, remplacer `toast.error(error.message)` par `setLoginError("Adresse email ou mot de passe incorrect")`
  - Ajouter un bloc d'erreur rouge entre les champs et le bouton de soumission
  - Effacer l'erreur quand l'utilisateur modifie email ou mot de passe

- **`src/components/AuthDialog.tsx`** :
  - Meme logique : state `loginError`, affichage inline, traduction du message

## 2. Email de reinitialisation en francais

**Probleme** : L'email de reinitialisation de mot de passe est envoye par le systeme d'authentification interne en anglais ("Reset your password...").

**Solution** : Creer une edge function `custom-reset-password` qui :
1. Genere le lien de reinitialisation via l'API admin
2. Envoie l'email en francais via Resend (deja configure avec `noreply@getcronos.fr`)
3. Utilise le meme design que les autres emails Cronos (header gradient, footer, branding)

### Fichiers modifies/crees

- **`supabase/functions/custom-reset-password/index.ts`** (nouveau) :
  - Recoit l'email de l'utilisateur
  - Utilise l'API admin Supabase pour generer un lien de reinitialisation (`generateLink` type `recovery`)
  - Envoie un email en francais via Resend avec le template Cronos (header gradient violet, bouton "Reinitialiser mon mot de passe", footer avec liens legaux)
  - Template du mail :
    - Sujet : "Reinitialiser votre mot de passe Cronos"
    - Corps : "Bonjour, Vous avez demande la reinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour en choisir un nouveau. [Bouton] Si vous n'etes pas a l'origine de cette demande, ignorez cet email."

- **`supabase/config.toml`** : Ajouter `[functions.custom-reset-password]` avec `verify_jwt = false`

- **`src/pages/ForgotPassword.tsx`** :
  - Remplacer l'appel `supabase.auth.resetPasswordForEmail()` par un appel a la nouvelle edge function `custom-reset-password`
  - Garder le meme comportement UI (ecran de succes, etc.)

### Details techniques

- La fonction utilise `SUPABASE_SERVICE_ROLE_KEY` pour `generateLink` (deja disponible dans les edge functions)
- L'email est envoye via Resend avec le meme `FROM_EMAIL` que les autres emails systeme (`Cronos <noreply@getcronos.fr>`)
- Le lien de reinitialisation redirige vers `/reset-password` comme actuellement
