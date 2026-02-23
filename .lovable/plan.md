

# Refonte de la page "Envoyer une campagne"

## Vue d'ensemble

Redesign complet de `UnifiedEmailSender.tsx` pour passer du layout actuel (tabs sequentiels Configuration/Preview empiles verticalement) a un **layout 2 colonnes simultane** (panneau config a gauche, preview a droite) conforme a la maquette HTML fournie.

## Changements visuels principaux

### 1. Layout general
- **Actuel** : Tabs pleine largeur (Configuration | Preview) avec contenu empile
- **Nouveau** : Grille `grid-cols-12` avec panneau gauche (col-span-4) et panneau droit (col-span-8), visibles simultanement

### 2. Panneau gauche (col-span-4) - 4 cartes empilees

**a) Carte "Statut Gmail"**
- Glassmorphisme avec icone Google en watermark
- Pastille verte animee "Connecte" ou bouton "Connecter Gmail"
- Email + quota restant en sous-texte
- Bouton refresh discret

**b) Carte "Destinataires"**
- Input pour ajout manuel d'email (avec bouton +)
- Liste scrollable des entreprises avec checkbox
- Chaque item : nom, email, tags colores (secteur), localisation
- Items selectionnes : bordure indigo + fond indigo/10
- Items non selectionnes : opacite reduite, fond neutre
- Footer : "Tout selectionner" / "Vider la liste" + compteur "X/Y selectionnee(s)"

**c) Carte "Options IA" (Premium)**
- Badge dore "Premium" en haut a droite
- Blur violet decoratif en arriere-plan
- 2 toggles avec icones dans des carres colores :
  - Emails personnalises (icone envelope, fond indigo)
  - Lettres de motivation (icone file, fond purple)
- Separateur
- 2 dropdowns en grille 2 colonnes : Approche + Ton
- Pour non-Premium : carte verrouillee avec upgrade banner

**d) Bouton d'action principal**
- Pleine largeur, gradient indigo-violet
- Texte dynamique : "Generer pour X entreprises"
- Icone wand-sparkles animee au hover

### 3. Panneau droit (col-span-8)

**Header tabs :**
- Pilule glassmorphisme avec 2 boutons : "Configuration" et "Previsualisation"
- Badge compteur sur Previsualisation

**Onglet Configuration (panneau droit) :**
- Contenu de l'email (objet + body + variables + pieces jointes)
- CV / Profil (upload, profils sauvegardes, textarea)
- Templates (charger/sauvegarder)

**Onglet Previsualisation :**
- Liste verticale de cards email generees
- Chaque card :
  - Header colore : icone check vert (succes) ou X rouge (erreur)
  - Nom entreprise + email
  - Badge "Lettre jointe" si cover letter
  - Boutons : oeil (preview), crayon (edit), X (supprimer)
  - Body : objet en gras + apercu du corps (line-clamp-2)
  - Etat erreur : fond rouge, bouton "Corriger manuellement"

**Carte "Options d'envoi" (en bas du panneau droit) :**
- Grille 2 colonnes :
  - Gauche : radio "Envoyer maintenant" / "Programmer l'envoi"
  - Droite : conseil pro (fond indigo) + bouton "Envoyer X emails prets" (fond blanc, texte noir)

### 4. Overlay de generation (inchange)
- Le composant `GenerationOverlay` reste identique

## Fichier a modifier

| Fichier | Action |
|---------|--------|
| `src/components/dashboard/UnifiedEmailSender.tsx` | Reecriture complete du JSX : layout 2 colonnes, glassmorphisme, nouveau design des cartes. La logique metier (states, handlers, API calls) reste 100% identique. |

## Details techniques

### Glassmorphisme unifie
Toutes les cartes utilisent la classe pattern :
```
bg-[#121215]/60 backdrop-blur-xl border border-white/[0.08] rounded-2xl
```

### Cards destinataires
- Selectionne : `border-indigo-500/30 bg-indigo-500/10`
- Non selectionne : `border-white/[0.08] bg-[#121215]/30 opacity-70 hover:opacity-100`
- Tags secteur : couleurs semantiques (teal pour SaaS, purple pour Design, etc.)

### Bouton d'envoi final
- Style inverse (fond blanc, texte noir) : `bg-white text-black hover:bg-gray-200`
- Shadow glow : `shadow-[0_0_20px_rgba(255,255,255,0.1)]`

### Ce qui ne change PAS
- Tous les states et hooks (useState, useEffect)
- Tous les handlers (handleGenerate, handleSendAll, handleEditEmail, etc.)
- Les appels API (supabase.functions.invoke)
- Le composant GenerationOverlay
- Le feature gating (usePlanFeatures, isPremium)
- Les dialogs d'edition et de sauvegarde
- La logique de smart merge et sync des destinataires manuels

### Responsive
- Desktop : 2 colonnes (4+8)
- Mobile : empilement vertical, panneau destinataires avec hauteur reduite

