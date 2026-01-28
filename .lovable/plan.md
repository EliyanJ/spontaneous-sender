
# Plan: Simplification du bouton post-recherche AutomaticSearch

## Objectif

Remplacer le bouton "Voir mes entreprises" par un unique bouton "Rechercher les emails de contact" apres une recherche reussie.

---

## Modification

### Fichier: `src/components/dashboard/AutomaticSearch.tsx`

Dans le bloc resultat (lignes 429-450), modifier le bouton existant:

```text
Avant:
+--------------------------------------------------+
| Recherche terminee !                              |
| X entreprises trouvees, Y ajoutees               |
|                     [Voir mes entreprises]        |
+--------------------------------------------------+

Apres:
+--------------------------------------------------+
| Recherche terminee !                              |
| X entreprises trouvees, Y ajoutees               |
|                                                   |
|        [Rechercher les emails de contact]         |
+--------------------------------------------------+
```

### Changements techniques:

1. Remplacer le bouton `Voir mes entreprises` par `Rechercher les emails de contact`
2. Changer l'icone de `Building2` vers `Mail`
3. Modifier l'action: `handleGoToCompanies` -> `onNavigateToTab('emails')`
4. Stocker dans sessionStorage la section cible pour ouvrir directement la recherche d'emails
5. Style: bouton principal (`bg-primary`) au lieu de `variant="outline"`

### Code resultant:

```typescript
<Button 
  onClick={() => {
    sessionStorage.setItem('emails_initial_section', 'search');
    onNavigateToTab?.('emails');
  }} 
  className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
>
  <Mail className="h-4 w-4" />
  Rechercher les emails de contact
</Button>
```

---

## Fichier a modifier

| Fichier | Modification |
|---------|--------------|
| `src/components/dashboard/AutomaticSearch.tsx` | Remplacer bouton "Voir mes entreprises" par "Rechercher les emails de contact" |
