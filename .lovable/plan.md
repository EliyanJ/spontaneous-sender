
## Plan — Sidebar verticale gauche sur le Dashboard

### Objectif
Remplacer la navigation horizontale dans le header du dashboard par une sidebar verticale collapsible sur la gauche. Les pages publiques (Landing, /prix, /score-cv, etc.) ne sont pas touchées.

### Nouvelle structure du menu (7 items)
```
- Dashboard        (overview)
- Recherche        (search)
- Campagnes        (emails → send)
- Suivi            (campaigns → onglet suivi interne)
- Relance          (campaigns → onglet relance)
- Comparateur CV   (cv-comparator)
- Créateur CV      (navigate → /createur-de-cv)
```

**Supprimés :** "Entreprises trouvées", "Recherche de contact", "Offres d'emploi" (reste accessible depuis la Landing/Header public), l'onglet Emails séparé.

**Réorganisation de CampaignsHub :** Le composant existant a déjà 2 onglets internes (`campaigns` et `suivi`). On va exposer ces 2 onglets comme items de sidebar distincts — en passant une prop `defaultTab` pour forcer l'onglet actif. On renomme "Campagnes" → "Relance" pour l'onglet historiques/relances, et "Suivi" reste tel quel.

### Fichiers à modifier

**1. `src/pages/Index.tsx`**
- Passer de `flex flex-col` à `flex flex-row` avec `SidebarProvider`
- Supprimer `HorizontalNav` du header
- Simplifier le header : Logo + CreditsDisplay + ProfileDropdown + ThemeToggle seulement
- Ajouter `<AppSidebar>` sur la gauche
- Adapter `renderContent()` pour les nouveaux tabs : `overview`, `search`, `campaigns` (avec prop `defaultTab="campaigns"`), `suivi` (avec prop `defaultTab="suivi"`), `relance`, `cv-comparator`, `cv-builder`
- Ajouter `cv-comparator` → rendu de `<CVComparator />`
- `tabOrder` mis à jour

**2. `src/components/AppSidebar.tsx`**
- Refonte complète avec les 7 items + icônes adaptées
- Logo Cronos + nom en haut de la sidebar (zone header)
- Collapsible avec `collapsible="icon"` (mini mode avec icônes seules)
- Bouton Admin visible pour les admins en bas
- ThemeToggle en bas
- Section utilisateur (crédits, avatar) en bas

**3. `src/components/dashboard/CampaignsHub.tsx`**
- Ajouter une prop `defaultTab?: 'campaigns' | 'suivi'` pour permettre d'ouvrir directement le bon onglet depuis la sidebar
- Renommer l'onglet `campaigns` en "Relance" dans l'affichage (les 2 items sidebar "Campagnes" et "Relance" pointent vers CampaignsHub avec des tabs différents)

**4. `src/components/HorizontalNav.tsx`**
- Non supprimé (pages publiques ne l'utilisent pas, mais Index.tsx ne l'importera plus)

**5. `src/components/MobileNav.tsx`**
- Mise à jour du menu mobile avec les 7 nouveaux items simplifiés

### Layout cible
```
┌─────────────────────────────────────────────┐
│  HEADER (Logo + Credits + Avatar + Theme)   │ ← 64px, sans nav
├──────────┬──────────────────────────────────┤
│          │                                  │
│ SIDEBAR  │   CONTENU PRINCIPAL              │
│ (200px   │   (flex-1, scrollable)           │
│  ou 56px │                                  │
│  mini)   │                                  │
│          │                                  │
│ [icons]  │                                  │
│          │                                  │
└──────────┴──────────────────────────────────┘
```

### Détails UX
- La sidebar est expanded par défaut sur desktop, collapsée sur mobile
- Chaque item actif : fond violet clair + texte violet (comme le style existant `bg-primary/10 text-primary`)
- Trigger de collapse intégré dans le header de la sidebar (bouton flèche)
- Le footer du dashboard (mentions légales) reste en bas du contenu principal

### Ordre d'implémentation
1. Modifier `AppSidebar.tsx` avec les 7 nouveaux items + layout (logo, user section, theme toggle)
2. Modifier `Index.tsx` pour intégrer la sidebar et adapter le layout + renderContent
3. Ajouter la prop `defaultTab` dans `CampaignsHub.tsx`
4. Mettre à jour `MobileNav.tsx`
