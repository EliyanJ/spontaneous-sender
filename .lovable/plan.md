
# Correction de la page Connexion

## Problemes identifies

1. **Aucun moyen de revenir a la page d'accueil** depuis `/login` -- l'utilisateur est bloque
2. **Bouton "Connexion avec cle d'acces" + badge "Bientot"** -- jamais demande, pas fonctionnel, confus pour les utilisateurs

## Ce qui sera fait

### 1. Ajouter un lien retour vers la page d'accueil

Un lien discret en haut a gauche de la carte (ou au-dessus) permettant de revenir a la landing page `/`. Typiquement une fleche avec "Retour a l'accueil".

### 2. Supprimer le bouton Passkey

Le bloc "Connexion avec cle d'acces" et son badge "Bientot" seront retires completement. Ca simplifie la page et evite toute confusion.

La page gardera uniquement :
- Bouton "Continuer avec Email"
- Bouton "Continuer avec Google"
- Lien inscription
- Liens aide / confidentialite / conditions

---

## Detail technique

### Fichier modifie

| Fichier | Modification |
|---------|-------------|
| `src/pages/Login.tsx` | Supprimer le bloc Passkey (lignes 122-138) + la fonction `handlePasskeyClick` (lignes 73-77). Ajouter un lien `<Link to="/">` avec une icone fleche retour au-dessus de la carte blanche. |

Aucun autre fichier n'est impacte.
