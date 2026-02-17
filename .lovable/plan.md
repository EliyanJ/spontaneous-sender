

# Admin : Codes promo Stripe + Changement de plan utilisateur

## Contexte

Actuellement, l'admin peut uniquement reset un abonnement au plan Free. Il n'existe aucune fonctionnalite pour :
- Creer/gerer des codes de reduction Stripe
- Upgrader/downgrader manuellement le plan d'un utilisateur

## Plan d'implementation

### 1. Gestion des coupons Stripe dans l'admin

Ajouter un nouvel onglet **"Promos"** dans la navigation admin (`AdminLayout.tsx`) qui pointe vers une nouvelle page `AdminPromos.tsx`.

Cette page permettra :
- **Lister** les coupons existants sur Stripe (via l'API Stripe)
- **Creer** un nouveau coupon (nom, pourcentage ou montant fixe, duree : une fois / X mois / pour toujours)
- **Voir** les codes promo associes

Tout passe par une nouvelle Edge Function `admin-manage-promos` qui utilise la cle Stripe pour interagir avec l'API Stripe coupons/promotion codes.

#### Edge Function `admin-manage-promos/index.ts`

Actions supportees :
- `list` : appelle `stripe.coupons.list()` + `stripe.promotionCodes.list()` pour lister les coupons et codes promo actifs
- `create_coupon` : appelle `stripe.coupons.create()` avec les parametres (name, percent_off ou amount_off, duration, duration_in_months)
- `create_promo_code` : appelle `stripe.promotionCodes.create()` pour generer un code texte associe a un coupon (ex: "LAUNCH20")
- `deactivate_promo` : appelle `stripe.promotionCodes.update()` pour desactiver un code promo

La fonction verifie que l'appelant est admin via `has_role`.

#### Page `AdminPromos.tsx`

- Section haute : formulaire de creation de coupon (nom, type de reduction %, montant, duree)
- Bouton pour generer un code promo textuel a partir du coupon cree
- Liste des codes promos existants avec statut actif/inactif et bouton de desactivation
- Les codes generes peuvent etre copies en un clic

### 2. Application des coupons au checkout

Modifier `create-checkout/index.ts` pour accepter un parametre optionnel `promoCode`. Si present, l'ajouter a la session Stripe via `allow_promotion_codes: true` (ou `discounts` avec un coupon specifique).

L'approche la plus simple : activer `allow_promotion_codes: true` sur toutes les sessions checkout. Ainsi, les utilisateurs peuvent entrer un code promo directement sur la page Stripe Checkout sans changement cote frontend.

### 3. Changement de plan admin dans la fiche utilisateur

Modifier `AdminUserDetail.tsx` pour ajouter dans l'onglet "Informations" une section **Abonnement** affichant :
- Le plan actuel (free/simple/plus)
- Les credits restants (sends_remaining, tokens_remaining)
- Un selecteur pour changer le plan manuellement

Le changement de plan passera par une mise a jour directe de la table `subscriptions` via la Edge Function `admin-reset-user-data` en ajoutant un nouveau `resetType: "upgrade_plan"` qui accepte un `targetPlan` (free, simple, plus) et met a jour :
- `plan_type` au nouveau plan
- `sends_remaining` et `sends_limit` selon le plan (free=5, simple=100, plus=400)
- `status` = 'active'

Pas besoin de passer par Stripe pour un changement admin manuel (c'est du testing/debug), on modifie uniquement la BDD locale.

---

## Details techniques

### Fichiers crees

- `supabase/functions/admin-manage-promos/index.ts` : Edge Function pour CRUD coupons/promos Stripe
- `src/pages/Admin/AdminPromos.tsx` : Page admin de gestion des codes promo

### Fichiers modifies

- `src/pages/Admin/AdminLayout.tsx` : Ajout de l'onglet "Promos" dans la nav
- `src/pages/Admin/index.ts` : Export de AdminPromos
- `src/App.tsx` : Route `/admin/promos`
- `supabase/functions/create-checkout/index.ts` : Ajout de `allow_promotion_codes: true`
- `supabase/functions/admin-reset-user-data/index.ts` : Ajout du resetType `upgrade_plan`
- `src/pages/Admin/AdminUserDetail.tsx` : Section abonnement avec selecteur de plan + affichage credits

### Aucune migration BDD necessaire

Tout passe par l'API Stripe pour les coupons (pas de table locale) et par la table `subscriptions` existante pour le changement de plan.

### Ordre d'implementation

1. `allow_promotion_codes: true` dans create-checkout (1 ligne)
2. Edge Function `admin-manage-promos`
3. Page `AdminPromos` + routing
4. Ajout `upgrade_plan` dans `admin-reset-user-data`
5. Section abonnement dans `AdminUserDetail`

