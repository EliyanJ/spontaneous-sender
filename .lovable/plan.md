

# Analyse : Système de Notifications Email Automatiques

## 1. État Actuel du Système

### Emails déjà implémentés (via Resend)
| Type | Destinataire | Statut |
|------|--------------|--------|
| `welcome` | Utilisateur | ✅ Fonctionnel |
| `ticket_notification` | Admin | ✅ Fonctionnel |
| `email_reminder` | Utilisateur | ✅ Fonctionnel |
| `response_detected` | Utilisateur | ⚠️ Désactivé (scope Gmail) |

### Problème actuel
L'adresse d'envoi est `Cronos <onboarding@resend.dev>` - c'est un domaine Resend de test qui :
- Limite l'envoi à 100 emails/jour
- Peut être marqué comme spam
- Ne fait pas professionnel

---

## 2. Solutions pour l'Email Générique

### Option A : Resend avec Domaine Personnalisé (Recommandé)
**Comment ça marche :** Tu gardes Resend (déjà configuré) mais tu ajoutes ton propre domaine.

**Avantages :**
- API déjà intégrée dans ton code
- Pas de changement de code nécessaire
- Excellent taux de délivrabilité
- Dashboard de suivi des emails

**Prix Resend :**
- Gratuit : 100 emails/jour, 3 000/mois
- Pro : 20 $/mois pour 50 000 emails/mois
- Scale : 90 $/mois pour 100 000 emails/mois

**Configuration requise :**
1. Acheter un domaine (ex: getcronos.fr - probablement déjà fait)
2. Ajouter les enregistrements DNS (SPF, DKIM, DMARC) sur IONOS
3. Vérifier le domaine dans le dashboard Resend
4. Changer `FROM_EMAIL` dans le code : `noreply@getcronos.fr`

### Option B : IONOS Email + SMTP
**Comment ça marche :** IONOS fournit une boîte email professionnelle avec accès SMTP.

**Prix IONOS :**
- Mail Basic : 1 €/mois (1 boîte, 2 Go)
- Mail Pro : 5 €/mois (1 boîte, 50 Go)
- Inclus : IMAP/SMTP, webmail, antispam

**Configuration SMTP IONOS :**
```text
Serveur SMTP : smtp.ionos.fr
Port : 587 (TLS) ou 465 (SSL)
Authentification : Adresse email complète + mot de passe
```

**Inconvénients :**
- Limite d'envoi stricte (généralement 500-1000 emails/jour)
- Pas de dashboard de tracking
- Nécessite de réécrire le code (passer de Resend à SMTP)

### Recommandation
**Resend + Domaine personnalisé getcronos.fr** est la meilleure option car :
- Zéro modification de code (juste changer FROM_EMAIL)
- Meilleure délivrabilité
- Tracking et analytics inclus
- Le `RESEND_API_KEY` est déjà configuré

---

## 3. Facturation Automatique Stripe

Stripe peut envoyer automatiquement des emails de facturation sans code supplémentaire.

### Configuration dans le Dashboard Stripe
1. **Settings > Billing > Subscriptions and emails**
2. Activer :
   - "Email finalized invoices to customers" (factures PDF)
   - "Send emails when card payments fail" (échecs de paiement)
   - "Send a Stripe-hosted link for payment" (lien de paiement)

### Ce que Stripe envoie automatiquement
| Email | Quand | Contenu |
|-------|-------|---------|
| Invoice (facture) | Après paiement | PDF avec détails |
| Receipt (reçu) | Après paiement | Récapitulatif |
| Payment failed | Échec carte | Lien pour mettre à jour |
| Subscription canceled | Annulation | Confirmation |
| Card expiring | Avant expiration | Rappel |

### Personnalisation
- **Dashboard > Settings > Branding** : Logo, couleurs
- **Dashboard > Settings > Billing > Invoice** : Template personnalisé

### Ce qu'il faut coder (optionnel)
Pour notifier l'admin des nouveaux paiements, ajouter dans `stripe-webhook` :
```text
case "checkout.session.completed":
  // ... code existant ...
  // Envoyer notification admin
  await supabase.functions.invoke('send-system-email', {
    body: { 
      type: 'payment_received',
      to: 'admin@getcronos.fr',
      customerEmail: customerEmail,
      amount: session.amount_total,
      planType: planType
    }
  });
```

---

## 4. Cas d'Usage à Implémenter

### Emails Utilisateur

| Événement | Actuellement | Action |
|-----------|--------------|--------|
| **Création compte** | ✅ Email welcome | Améliorer : inclure CGV en pièce jointe |
| **Connexion Gmail** | ❌ Pas d'email | Créer type `gmail_connected` |
| **Campagne envoyée** | ❌ Pas d'email | Créer type `campaign_summary` |
| **Mot de passe oublié** | ⚠️ Via Supabase Auth | Personnaliser template Supabase |
| **Ticket créé** | ❌ Pas à l'utilisateur | Créer type `ticket_confirmation` |
| **Paiement réussi** | ⚠️ Via Stripe | Stripe peut le faire automatiquement |

### Emails Admin

| Événement | Actuellement | Action |
|-----------|--------------|--------|
| **Ticket créé** | ✅ Email admin | OK |
| **Nouveau paiement** | ❌ Pas d'email | Créer type `payment_received_admin` |
| **Nouvel utilisateur** | ❌ Pas d'email | Créer type `new_user_admin` |

### Emails Additionnels à Considérer

| Email | Description | Priorité |
|-------|-------------|----------|
| **Crédits faibles** | Alerte quand < 10 crédits restants | Haute |
| **Abonnement expirant** | Rappel 7 jours avant fin | Moyenne |
| **Inactivité** | Rappel après 14 jours sans connexion | Basse |
| **Newsletter/Tips** | Conseils de prospection | Optionnel |

---

## 5. Détail des Nouveaux Templates

### `gmail_connected` (connexion scope sensible)
```text
Objet : "🔗 Votre compte Gmail est connecté à Cronos"
Contenu :
- Confirmation de la connexion
- Rappel des permissions accordées (gmail.send uniquement)
- Comment révoquer l'accès
- Lien vers les paramètres
```

### `campaign_summary` (récap campagne)
```text
Objet : "📊 Récap : Campagne de X emails envoyée"
Contenu :
- Nombre d'emails envoyés
- Liste des entreprises contactées
- Date/heure d'envoi
- Lien vers le suivi dans le dashboard
```

### `ticket_confirmation` (confirmation ticket)
```text
Objet : "🎫 Ticket #XXX reçu - Nous vous répondrons rapidement"
Contenu :
- Numéro du ticket
- Rappel du sujet
- Délai de réponse estimé
- Lien vers l'historique
```

### `credits_low` (crédits faibles)
```text
Objet : "⚠️ Plus que X crédits restants sur Cronos"
Contenu :
- Nombre de crédits restants
- Date de renouvellement (si abonné)
- Bouton "Acheter des crédits"
```

---

## 6. Architecture Proposée

```text
┌─────────────────────────────────────────────────────────────┐
│                     ÉVÉNEMENTS                               │
├─────────────┬─────────────┬─────────────┬─────────────────────┤
│  Register   │  Gmail      │  Campaign   │  Payment            │
│  (Auth)     │  Connect    │  Sent       │  (Stripe)           │
└─────┬───────┴─────┬───────┴─────┬───────┴─────┬───────────────┘
      │             │             │             │
      ▼             ▼             ▼             ▼
┌─────────────────────────────────────────────────────────────┐
│              send-system-email (Edge Function)              │
│  Types: welcome, gmail_connected, campaign_summary,         │
│         ticket_notification, ticket_confirmation,           │
│         payment_received_admin, credits_low                 │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    RESEND API                                │
│              noreply@getcronos.fr                            │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              STRIPE (emails automatiques)                    │
│  Factures PDF, Reçus, Échecs paiement                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. Plan d'Implémentation

### Phase 1 : Configuration domaine (30 min)
1. Configurer getcronos.fr dans Resend (DNS)
2. Vérifier le domaine
3. Mettre à jour `FROM_EMAIL` dans le code

### Phase 2 : Stripe automatique (15 min)
1. Activer les emails automatiques dans Stripe Dashboard
2. Personnaliser le branding

### Phase 3 : Nouveaux templates (2-3h)
1. `gmail_connected` - email après connexion Gmail
2. `campaign_summary` - récap après envoi campagne
3. `ticket_confirmation` - confirmation à l'utilisateur
4. `payment_received_admin` - notification admin paiement
5. `credits_low` - alerte crédits faibles

### Phase 4 : Triggers (1-2h)
1. Déclencher `gmail_connected` après `/connect-gmail/callback`
2. Déclencher `campaign_summary` après `send-campaign-emails`
3. Ajouter notification admin dans `stripe-webhook`
4. Créer un cron pour vérifier les crédits faibles

---

## 8. Résumé des Choix Techniques

| Besoin | Solution |
|--------|----------|
| Adresse email générique | Resend + domaine getcronos.fr |
| Facturation automatique | Stripe emails natifs |
| Notifications système | Edge function `send-system-email` |
| Notifications in-app | Table `user_notifications` (existante) |

