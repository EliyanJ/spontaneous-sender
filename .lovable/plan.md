

# Plan de Refonte: Navigation Landing + Nouvelle Page Connexion

## Resume des changements demandes

1. **Navigation horizontale en haut de la landing** (style Shopify)
   - Liens ancres: Fonctionnalites, Comment ca marche, Tarification
   - Boutons: Se connecter, Commencer

2. **Nouvelle page de connexion dediee** (remplacer le popup)
   - Page complete `/login` (pas de fond assombri)
   - Bouton Email, Bouton Passkey, Bouton Google avec logo
   - Lien "Nouveau ? Creer votre compte"
   - Liens en bas: Aide, Confidentialite, Conditions
   - Encart de redirection Google avec logo Cronos

3. **Synchronisation des prix sur la landing**
   - Gratuit: 0EUR
   - Standard: 14EUR/mois (actuellement affiche 9,99EUR)
   - Premium: 39EUR/mois (actuellement affiche 19,99EUR)
   - Descriptions alignees avec les vraies fonctionnalites

4. **Creer une page Aide** (`/help`)
   - Instructions de connexion
   - Contact support

---

## Architecture technique

### Fichiers a creer

1. **`src/pages/Login.tsx`** - Nouvelle page de connexion complete
2. **`src/pages/Help.tsx`** - Page d'aide

### Fichiers a modifier

1. **`src/pages/Landing.tsx`**
   - Ajouter navigation horizontale avec ancres
   - Corriger les prix affiches (14EUR et 39EUR)
   - Mettre a jour les descriptions des plans
   - Remplacer `setAuthOpen(true)` par `navigate("/login")`
   - Ajouter `id` aux sections pour les ancres

2. **`src/App.tsx`**
   - Ajouter routes `/login` et `/help`

3. **`src/pages/Auth.tsx`** (ou supprimer)
   - Conserver uniquement pour le callback OAuth
   - La connexion se fera sur `/login`

---

## Detail de l'implementation

### 1. Navigation Landing (Landing.tsx)

```text
+----------------------------------------------------------+
| [Logo] Cronos    Fonctionnalites  Comment ca marche      |
|                  Tarification     [Se connecter] [Commencer]|
+----------------------------------------------------------+
```

- `Fonctionnalites` -> ancre `#features`
- `Comment ca marche` -> ancre `#how-it-works`
- `Tarification` -> ancre `#pricing`
- `Se connecter` -> `/login`
- `Commencer` -> `/login`

### 2. Nouvelle page Login (src/pages/Login.tsx)

```text
+--------------------------------------------------+
|                                                  |
|           [Logo Cronos]                          |
|           Cronos                                 |
|                                                  |
|    [ Email          Continuer avec Email     ]   |
|    [ Cle           Connexion avec cle d'acces ]  |
|    [ G             Continuer avec Google      ]  |
|                                                  |
|    ----------------------------------------      |
|                                                  |
|    Nouveau sur Cronos ? Creer votre compte       |
|                                                  |
|    ----------------------------------------      |
|    Aide  |  Confidentialite  |  Conditions       |
+--------------------------------------------------+
```

**Comportement Google:**
- Au clic sur Google -> afficher overlay avec logo Cronos + "Redirection vers Google..."
- Puis lancer `signInWithOAuth`

**Boutons:**
- Email -> Affiche formulaire email/password inline
- Passkey -> Pour l'instant, afficher un toast "Bientot disponible"
- Google -> Overlay puis redirection

### 3. Correction des prix (Landing.tsx)

Section "Des offres simples" actuelle:
```
Gratuit: 0EUR - OK
Simple: 9,99EUR -> Corriger en 14EUR (Standard)
Plus: 19,99EUR -> Corriger en 39EUR (Premium)
```

Nouvelles descriptions alignees avec `stripe-config.ts`:

**Standard (14EUR/mois):**
- 100 envois par mois
- Recherche automatique par departement
- Template email generique
- Suivi des reponses

**Premium (39EUR/mois):**
- 400 envois par mois
- Recherche IA + manuelle precise
- Emails personnalises par IA
- Lettres de motivation generees
- Acces offres d'emploi

### 4. Page Aide (src/pages/Help.tsx)

```text
+--------------------------------------------------+
|  [<- Retour]                     Centre d'aide   |
|                                                  |
|  Comment se connecter                            |
|  -------------------------------------------     |
|  1. Cliquez sur "Se connecter"                   |
|  2. Choisissez votre methode...                  |
|                                                  |
|  Problemes de connexion ?                        |
|  -------------------------------------------     |
|  - Verifiez votre email/mot de passe             |
|  - Essayez avec Google                           |
|                                                  |
|  Nous contacter                                  |
|  -------------------------------------------     |
|  Email: support@cronos.fr                        |
+--------------------------------------------------+
```

---

## Flux utilisateur

### Connexion via Google:
```text
1. Utilisateur sur Landing -> clique "Se connecter"
2. Redirige vers /login
3. Clique sur "Continuer avec Google"
4. Overlay s'affiche: [Logo Cronos] "Redirection vers Google..."
5. Redirection vers Google OAuth
6. Callback sur /auth (existant)
7. Redirection vers /dashboard
```

### Connexion via Email:
```text
1. Utilisateur sur /login -> clique "Continuer avec Email"
2. Formulaire email/password s'affiche
3. Saisie credentials -> clic "Se connecter"
4. Redirection vers /dashboard
```

### Inscription:
```text
1. Utilisateur sur /login -> clique "Creer votre compte"
2. Redirige vers /register (existant)
3. Formulaire complet d'inscription
```

---

## Routes (App.tsx)

Ajouter:
```typescript
<Route path="/login" element={<Login />} />
<Route path="/help" element={<Help />} />
```

Conserver `/auth` pour le callback OAuth uniquement.

---

## Resume des taches

| # | Tache | Fichier |
|---|-------|---------|
| 1 | Creer page Login avec boutons Email/Passkey/Google | src/pages/Login.tsx |
| 2 | Creer page Help | src/pages/Help.tsx |
| 3 | Ajouter navigation horizontale avec ancres | src/pages/Landing.tsx |
| 4 | Corriger prix (14EUR/39EUR) et descriptions | src/pages/Landing.tsx |
| 5 | Remplacer popup auth par navigation vers /login | src/pages/Landing.tsx |
| 6 | Ajouter id aux sections pour ancres | src/pages/Landing.tsx |
| 7 | Ajouter routes /login et /help | src/App.tsx |

