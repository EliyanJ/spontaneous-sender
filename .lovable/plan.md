
# Amelioration du workflow d'envoi d'emails

## Problemes identifies et corrections

### 1. Plan Plus : conserver l'acces au mode manuel

**Probleme** : Sur le plan Plus, quand les toggles IA sont desactives, le formulaire manuel s'affiche bien. Mais il manque de clarte UX pour l'utilisateur.

**Solution** : Ajouter un texte explicatif dans la section "Options IA" indiquant clairement que desactiver les toggles permet d'utiliser le mode manuel classique. Pas de changement de logique, juste un meilleur guidage.

---

### 2. Previsualisation : pouvoir retirer des entreprises

**Probleme** : Dans l'onglet "Previsualisation", la liste des emails generes n'offre aucun bouton de suppression. On ne peut que voir/editer.

**Solution** : Ajouter un bouton "Retirer" (icone X ou Trash) sur chaque ligne d'email dans la preview. Ce bouton supprimera l'entree du tableau `generatedEmails` via un `filter()`.

**Fichier modifie** : `src/components/dashboard/UnifiedEmailSender.tsx`
- Ajouter une fonction `handleRemoveGeneratedEmail(company_id)`
- Ajouter un bouton a cote de Eye et Edit3 dans la preview list (lignes 1151-1154)

---

### 3. Previsualisation : editer la lettre de motivation

**Probleme** : Le dialogue d'edition ne contient que l'objet et le corps du mail. La lettre de motivation n'est pas editable.

**Solution** : Ajouter un champ `Textarea` supplementaire dans le dialogue d'edition pour la lettre de motivation, conditionnel a la presence de `editingEmail?.coverLetter`. Sauvegarder la valeur editee dans `generatedEmails`.

**Fichier modifie** : `src/components/dashboard/UnifiedEmailSender.tsx`
- Ajouter un state `editedCoverLetter`
- Populer ce state dans `handleEditEmail`
- Afficher le textarea dans le Edit Dialog quand `coverLetter` est present
- Mettre a jour `handleSaveEdit` pour inclure `coverLetter`

---

### 4. Emails manuels visibles en previsualisation (tous les plans)

**Probleme** : Les emails manuels ne sont visibles que si on clique "Preparer". Or l'utilisateur s'attend a les voir apparaitre directement dans la preview.

**Solution** : Quand l'utilisateur ajoute un email manuel et que du contenu (objet/body) est saisi, ces emails doivent etre automatiquement ajoutes a `generatedEmails` pour apparaitre en preview, sans forcer un clic sur "Preparer". Alternative plus simple : rendre le bouton "Preparer" plus visible et s'assurer que les emails manuels y sont bien inclus (ce qui est deja le cas dans le code, mais peu evident pour l'utilisateur).

**Approche retenue** : On va synchroniser automatiquement les emails manuels dans la liste `generatedEmails` a chaque changement de `manualRecipients`, `subject` ou `body` quand on est en mode non-IA. Cela permettra de voir immediatement les destinataires dans la preview.

**Fichier modifie** : `src/components/dashboard/UnifiedEmailSender.tsx`
- Ajouter un `useEffect` qui met a jour `generatedEmails` pour les destinataires manuels quand `manualRecipients`, `subject`, ou `body` changent (en mode non-IA uniquement)

---

### 5. Ne pas re-generer les emails deja generes (merge intelligent)

**Probleme** : Quand on retourne dans "Configuration" apres avoir genere, cliquer "Generer" efface tout et regenere pour toutes les entreprises selectionnees, y compris celles deja traitees.

**Solution** : Implementer un systeme de merge :
- Avant de generer, identifier les entreprises deja presentes dans `generatedEmails`
- Ne generer que pour les **nouvelles** entreprises selectionnees (celles pas encore dans `generatedEmails`)
- Fusionner les anciens resultats avec les nouveaux
- Ajouter un bouton "Regenerer tout" pour forcer une re-generation complete si l'utilisateur le souhaite

**Fichier modifie** : `src/components/dashboard/UnifiedEmailSender.tsx`
- Modifier `handleGenerate` pour filtrer les entreprises deja generees
- Merger les nouveaux resultats avec les anciens via spread operator
- Ajouter un bouton "Regenerer tout" avec un `forceRegenerate` flag

---

### 6. Plan Plus : auto-generation IA pour emails manuels

**Probleme** : Si un utilisateur Plus ajoute manuellement un email (sans entreprise associee), il n'y a pas de generation IA automatique pour cet email.

**Solution** : Quand un utilisateur Plus a les toggles IA actives et ajoute un email manuel, generer automatiquement un objet et un contenu IA base sur le CV mais sans info entreprise specifique (generation generique). Cela passe par un appel a `generate-personalized-emails` avec un "company" fictif construit a partir de l'email.

**Fichier modifie** : `src/components/dashboard/UnifiedEmailSender.tsx`
- Dans `handleGenerate`, si `enableAIEmails` et qu'il y a des `manualRecipients`, creer des objets "company" factices et les inclure dans la generation IA
- Fusionner les resultats des manuels avec ceux des entreprises

---

## Resume des modifications

| Fichier | Modifications |
|---------|-------------|
| `UnifiedEmailSender.tsx` | Bouton retirer en preview, edition lettre de motivation, sync auto emails manuels, merge intelligent, generation IA manuels |

## Ordre d'implementation

1. Bouton de suppression dans la preview (rapide, critique UX)
2. Edition de la lettre de motivation dans le dialogue
3. Merge intelligent pour eviter la re-generation
4. Sync automatique des emails manuels dans la preview
5. Generation IA pour emails manuels (Plan Plus)
6. Texte explicatif mode manuel sur le plan Plus
